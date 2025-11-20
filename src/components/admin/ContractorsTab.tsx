import { useState, useEffect, useCallback } from 'react'
import { Table, Space, Button, Modal, Form, Input, App, Divider, Radio, List } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ImportContractorsModal } from './ImportContractorsModal'
import {
  loadContractorsWithNames,
  addContractorAlternativeName,
  deleteContractorAlternativeName,
  setPrimaryContractorName,
} from '../../services/employeeOperations'
import type { FormValues } from '../../types/common'
import { useTableSearch } from '../../hooks/useTableSearch'

export const ContractorsTab = () => {
  const { message: messageApi, modal } = App.useApp()
  const [contractors, setContractors] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingContractor, setEditingContractor] = useState<any | null>(null)
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [namesModalVisible, setNamesModalVisible] = useState(false)
  const [selectedContractor, setSelectedContractor] = useState<any | null>(null)
  const [newNameInput, setNewNameInput] = useState('')
  const [form] = Form.useForm()
  const { user } = useAuth()
  const { getColumnSearchProps } = useTableSearch()

  const loadContractors = useCallback(async () => {
    setLoading(true)
    try {
      const data = await loadContractorsWithNames()
      setContractors(data)
    } catch (error) {
      console.error('[ContractorsTab.loadContractors] Error:', error)
      messageApi.error('Ошибка загрузки контрагентов')
    } finally {
      setLoading(false)
    }
  }, [messageApi])

  useEffect(() => {
    loadContractors()
  }, [loadContractors])

  const handleCreate = () => {
    setEditingContractor(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (record: any) => {
    setEditingContractor(record)
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const handleSubmit = async (values: FormValues) => {
    try {
      if (values.inn) {
        const { data: existingContractors, error: checkError } = await supabase
          .from('contractors')
          .select('id, name')
          .eq('inn', values.inn)
          .neq('id', editingContractor?.id || 0)

        if (!checkError && existingContractors && existingContractors.length > 0) {
          const existingContractor = existingContractors[0]
          messageApi.error(`Контрагент с ИНН ${values.inn} уже существует: ${existingContractor.name}`, 5)
          form.setFields([
            {
              name: 'inn',
              errors: [`ИНН уже используется компанией "${existingContractor.name}"`],
            },
          ])
          return
        }
      }

      if (editingContractor) {
        const { error } = await supabase
          .from('contractors')
          .update(values)
          .eq('id', editingContractor.id)

        if (error) throw error
        messageApi.success('Контрагент обновлен')
      } else {
        const { data: newContractor, error } = await supabase
          .from('contractors')
          .insert([{ ...values, created_by: user?.id }])
          .select()
          .single()

        if (error) throw error

        // Add main name as alternative name
        if (newContractor && values.name) {
          await addContractorAlternativeName(newContractor.id, String(values.name), true)
        }

        messageApi.success('Контрагент создан')
      }

      setIsModalVisible(false)
      loadContractors()
    } catch (error: unknown) {
      console.error('[ContractorsTab.handleSubmit] Error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ошибка сохранения контрагента'
      messageApi.error(errorMessage)
    }
  }

  const handleDelete = async (id: number) => {
    modal.confirm({
      title: 'Удалить контрагента?',
      content: 'Это действие нельзя отменить',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('contractors')
            .delete()
            .eq('id', id)

          if (error) throw error
          messageApi.success('Контрагент удален')
          loadContractors()
        } catch (error) {
          console.error('[ContractorsTab.handleDelete] Error:', error)
          messageApi.error('Ошибка удаления контрагента')
        }
      }
    })
  }

  const handleManageNames = (record: any) => {
    setSelectedContractor(record)
    setNamesModalVisible(true)
  }

  const handleAddName = async () => {
    if (!newNameInput.trim() || !selectedContractor) return

    try {
      await addContractorAlternativeName(selectedContractor.id, newNameInput, false)
      setNewNameInput('')
      loadContractors()
      const updated = await loadContractorsWithNames()
      const refreshed = updated.find(c => c.id === selectedContractor.id)
      setSelectedContractor(refreshed)
    } catch (error) {
      console.error('Error adding name:', error)
    }
  }

  const handleDeleteName = async (nameId: number) => {
    try {
      await deleteContractorAlternativeName(nameId)
      loadContractors()
      const updated = await loadContractorsWithNames()
      const refreshed = updated.find(c => c.id === selectedContractor.id)
      setSelectedContractor(refreshed)
    } catch (error) {
      console.error('Error deleting name:', error)
    }
  }

  const handleSetPrimary = async (nameId: number) => {
    if (!selectedContractor) return

    try {
      await setPrimaryContractorName(selectedContractor.id, nameId)
      loadContractors()
      const updated = await loadContractorsWithNames()
      const refreshed = updated.find(c => c.id === selectedContractor.id)
      setSelectedContractor(refreshed)
    } catch (error) {
      console.error('Error setting primary:', error)
    }
  }

  const getPrimaryName = (contractor: any) => {
    if (!contractor.alternative_names || contractor.alternative_names.length === 0) {
      return contractor.name
    }
    const primary = contractor.alternative_names.find((n: any) => n.is_primary)
    return primary ? primary.alternative_name : contractor.name
  }

  const handlePrefixClick = (prefix: string) => {
    const currentName = (form.getFieldValue('name') as string | undefined) || ''
    const withoutExistingPrefix = currentName
      .replace(/^(ООО|ИП|АО)\s+/i, '')
      .replace(/[«»"]/g, '')
      .trim()

    let nextValue: string
    if (prefix === 'ООО' || prefix === 'АО') {
      nextValue = withoutExistingPrefix ? `${prefix} «${withoutExistingPrefix}»` : prefix
    } else {
      nextValue = withoutExistingPrefix ? `${prefix} ${withoutExistingPrefix}` : prefix
    }

    form.setFieldsValue({ name: nextValue })
    form.validateFields(['name'])
  }

  const columns: ColumnsType<any> = [
    {
      title: 'Основное название',
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => getPrimaryName(record),
      sorter: (a, b) => getPrimaryName(a).localeCompare(getPrimaryName(b)),
      ...getColumnSearchProps('name'),
    },
    {
      title: 'ИНН',
      dataIndex: 'inn',
      key: 'inn',
      sorter: (a, b) => (a.inn || '').localeCompare(b.inn || ''),
      ...getColumnSearchProps('inn'),
    },
    {
      title: 'Альтернативные названия',
      dataIndex: 'alternative_names',
      key: 'alternative_names',
      render: (names: any[]) => {
        if (!names || names.length <= 1) return '—'
        return `${names.length - 1} ещё`
      },
      sorter: (a: any, b: any) => {
        const aCount = (a.alternative_names?.length || 0) - 1
        const bCount = (b.alternative_names?.length || 0) - 1
        return aCount - bCount
      },
      onFilter: (value: any, record: any) => {
        if (!record.alternative_names) return false
        const searchValue = (value as string).toLowerCase()
        return record.alternative_names.some((name: any) =>
          name.alternative_name.toLowerCase().includes(searchValue)
        )
      }
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (date) => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            onClick={() => handleManageNames(record)}
          >
            Названия
          </Button>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          />
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      )
    }
  ]

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            Добавить контрагента
          </Button>
          <Button
            icon={<UploadOutlined />}
            onClick={() => setImportModalVisible(true)}
          >
            Импорт из XLSX
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={contractors}
        loading={loading}
        rowKey="id"
        pagination={{
          defaultPageSize: 100,
          showSizeChanger: true,
          pageSizeOptions: ['50', '100', '200'],
          showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} контрагентов`,
          position: ['bottomRight']
        }}
        tableLayout="auto"
      />

      <Modal
        title={editingContractor ? 'Редактировать контрагента' : 'Создать контрагента'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Название компании"
            rules={[{ required: true, message: 'Укажите название компании' }]}
          >
            <div>
              <Form.Item
                name="name"
                noStyle
              >
                <Input placeholder="Введите название компании" />
              </Form.Item>
              <div style={{ marginTop: 8 }}>
                <Space size={8} wrap>
                  {['ООО', 'ИП', 'АО'].map((prefix) => (
                    <Button
                      key={prefix}
                      size="small"
                      onClick={() => handlePrefixClick(prefix)}
                      style={{ cursor: 'pointer' }}
                    >
                      {prefix}
                    </Button>
                  ))}
                </Space>
              </div>
            </div>
          </Form.Item>

          <Form.Item
            name="inn"
            label="ИНН"
            rules={[
              { required: true, message: 'Укажите ИНН' },
              { pattern: /^\d{10}$|^\d{12}$/, message: 'ИНН должен содержать 10 или 12 цифр' }
            ]}
            validateTrigger="onBlur"
          >
            <Input
              placeholder="10 или 12 цифр"
              maxLength={12}
              onChange={() => {
                form.setFields([
                  {
                    name: 'inn',
                    errors: [],
                  },
                ])
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit">
                {editingContractor ? 'Обновить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Названия для ${selectedContractor?.name}`}
        open={namesModalVisible}
        onCancel={() => setNamesModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedContractor && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  placeholder="Введите новое название"
                  value={newNameInput}
                  onChange={(e) => setNewNameInput(e.target.value)}
                  onPressEnter={handleAddName}
                />
                <Button type="primary" onClick={handleAddName}>
                  Добавить
                </Button>
              </Space.Compact>
            </div>

            <Divider />

            {selectedContractor.alternative_names && selectedContractor.alternative_names.length > 0 ? (
              <List
                dataSource={selectedContractor.alternative_names}
                renderItem={(item: any) => (
                  <List.Item
                    actions={[
                      <Radio
                        checked={item.is_primary}
                        onChange={() => handleSetPrimary(item.id)}
                      >
                        Основное
                      </Radio>,
                      <Button
                        type="link"
                        danger
                        size="small"
                        onClick={() => handleDeleteName(item.id)}
                      >
                        Удалить
                      </Button>
                    ]}
                  >
                    <div>
                      <div style={{ fontWeight: item.is_primary ? 'bold' : 'normal' }}>
                        {item.alternative_name}
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <p>Нет альтернативных названий</p>
            )}
          </div>
        )}
      </Modal>

      <ImportContractorsModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onSuccess={() => {
          loadContractors()
          setImportModalVisible(false)
        }}
      />
    </>
  )
}