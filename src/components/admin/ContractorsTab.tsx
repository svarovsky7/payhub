import { useState, useEffect, useCallback } from 'react'
import { Table, Space, Button, Modal, Form, Input, App } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase, type Contractor } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ImportContractorsModal } from './ImportContractorsModal'
import type { FormValues } from '../../types/common'

export const ContractorsTab = () => {
  const { message: messageApi, modal } = App.useApp()
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null)
  const [importModalVisible, setImportModalVisible] = useState(false)
  const [form] = Form.useForm()
  const { user } = useAuth()

  const loadContractors = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setContractors(data || [])
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

  const handleEdit = (record: Contractor) => {
    setEditingContractor(record)
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const handleSubmit = async (values: FormValues) => {
    try {
      // Проверяем, существует ли контрагент с таким ИНН
      if (values.inn) {
        const { data: existingContractors, error: checkError } = await supabase
          .from('contractors')
          .select('id, name')
          .eq('inn', values.inn)
          .neq('id', editingContractor?.id || 0)


        if (!checkError && existingContractors && existingContractors.length > 0) {
          const existingContractor = existingContractors[0]
          messageApi.error(`Контрагент с ИНН ${values.inn} уже существует: ${existingContractor.name}`, 5)

          // Также показываем ошибку под полем ИНН
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
        const { error } = await supabase
          .from('contractors')
          .insert([{ ...values, created_by: user?.id }])

        if (error) throw error
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

  const handlePrefixClick = (prefix: string) => {
    const currentName = (form.getFieldValue('name') as string | undefined) || ''
    // Удаляем существующий префикс и кавычки
    const withoutExistingPrefix = currentName
      .replace(/^(ООО|ИП|АО)\s+/i, '')
      .replace(/[«»"]/g, '')
      .trim()

    let nextValue: string
    if (prefix === 'ООО' || prefix === 'АО') {
      // Для ООО и АО добавляем кавычки-ёлочки
      nextValue = withoutExistingPrefix ? `${prefix} «${withoutExistingPrefix}»` : prefix
    } else {
      // Для ИП не добавляем кавычки
      nextValue = withoutExistingPrefix ? `${prefix} ${withoutExistingPrefix}` : prefix
    }

    form.setFieldsValue({ name: nextValue })

    // Триггерим обновление значения формы для валидации
    form.validateFields(['name'])
  }

  // Функция для создания фильтра поиска
  const getColumnSearchProps = (dataIndex: string) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: {
      setSelectedKeys: (keys: React.Key[]) => void
      selectedKeys: React.Key[]
      confirm: () => void
      clearFilters?: () => void
    }) => (
      <div style={{ padding: 8 }}>
        <Input
          placeholder={`Поиск ${dataIndex === 'name' ? 'по названию' : 'по ИНН'}`}
          value={selectedKeys[0]}
          onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Найти
          </Button>
          <Button
            onClick={() => {
              clearFilters?.()
              confirm()
            }}
            size="small"
            style={{ width: 90 }}
          >
            Сброс
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
    onFilter: (value: boolean | React.Key, record: Contractor) =>
      record[dataIndex as keyof Contractor]
        ?.toString()
        .toLowerCase()
        .includes(String(value).toLowerCase()) ?? false
  })

  const columns: ColumnsType<Contractor> = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      ...getColumnSearchProps('name'),
      width: '40%'
    },
    {
      title: 'ИНН',
      dataIndex: 'inn',
      key: 'inn',
      sorter: (a, b) => (a.inn || '').localeCompare(b.inn || ''),
      ...getColumnSearchProps('inn'),
      width: '25%'
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (date) => new Date(date).toLocaleDateString('ru-RU'),
      width: '20%'
    },
    {
      title: 'Действия',
      key: 'actions',
      width: '15%',
      render: (_, record) => (
        <Space size="small">
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
            Импорт из CSV
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={contractors}
        loading={loading}
        rowKey="id"
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} контрагентов`,
          showQuickJumper: true,
          position: ['bottomRight']
        }}
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
                // Очищаем ошибку при изменении значения
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