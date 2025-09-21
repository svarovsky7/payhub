import { useState, useEffect } from 'react'
import { Table, Space, Button, Modal, Form, Input, Select, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase, type Contractor, type ContractorType } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export const ContractorsTab = () => {
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [contractorTypes, setContractorTypes] = useState<ContractorType[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null)
  const [form] = Form.useForm()
  const { user } = useAuth()

  useEffect(() => {
    loadContractors()
    loadContractorTypes()
  }, [])

  const loadContractors = async () => {
    console.log('[ContractorsTab.loadContractors] Loading contractors')
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('[ContractorsTab.loadContractors] Loaded contractors:', data?.length || 0)
      setContractors(data || [])
    } catch (error) {
      console.error('[ContractorsTab.loadContractors] Error:', error)
      message.error('Ошибка загрузки контрагентов')
    } finally {
      setLoading(false)
    }
  }

  const loadContractorTypes = async () => {
    console.log('[ContractorsTab.loadContractorTypes] Loading types')
    try {
      const { data, error } = await supabase
        .from('contractor_types')
        .select('*')
        .order('name')

      if (error) throw error
      setContractorTypes(data || [])
    } catch (error) {
      console.error('[ContractorsTab.loadContractorTypes] Error:', error)
    }
  }

  const handleCreate = () => {
    console.log('[ContractorsTab.handleCreate] Opening create modal')
    setEditingContractor(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (record: Contractor) => {
    console.log('[ContractorsTab.handleEdit] Editing contractor:', record.id)
    setEditingContractor(record)
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const handleSubmit = async (values: any) => {
    console.log('[ContractorsTab.handleSubmit] Submitting:', values)
    try {
      if (editingContractor) {
        const { error } = await supabase
          .from('contractors')
          .update(values)
          .eq('id', editingContractor.id)

        if (error) throw error
        message.success('Контрагент обновлен')
      } else {
        const { error } = await supabase
          .from('contractors')
          .insert([{ ...values, created_by: user?.id }])

        if (error) throw error
        message.success('Контрагент создан')
      }

      setIsModalVisible(false)
      loadContractors()
    } catch (error: any) {
      console.error('[ContractorsTab.handleSubmit] Error:', error)
      message.error(error.message || 'Ошибка сохранения контрагента')
    }
  }

  const handleDelete = async (id: number) => {
    console.log('[ContractorsTab.handleDelete] Deleting contractor:', id)
    Modal.confirm({
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
          message.success('Контрагент удален')
          loadContractors()
        } catch (error) {
          console.error('[ContractorsTab.handleDelete] Error:', error)
          message.error('Ошибка удаления контрагента')
        }
      }
    })
  }

  const handlePrefixClick = (prefix: string) => {
    const currentName = (form.getFieldValue('name') as string | undefined) || ''
    const withoutExistingPrefix = currentName.replace(/^(ООО|ИП|АО)\s+/i, '').trim()
    const nextValue = withoutExistingPrefix ? `${prefix} ${withoutExistingPrefix}` : prefix
    form.setFieldsValue({ name: nextValue })
  }

  const getTypeName = (typeId: number) => {
    const type = contractorTypes.find(t => t.id === typeId)
    return type?.name || 'Неизвестный'
  }

  const columns: ColumnsType<Contractor> = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'ИНН',
      dataIndex: 'inn',
      key: 'inn',
      width: 130
    },
    {
      title: 'Тип',
      dataIndex: 'type_id',
      key: 'type_id',
      width: 150,
      render: (typeId) => getTypeName(typeId)
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date) => new Date(date).toLocaleDateString('ru-RU')
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
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
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Добавить контрагента
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={contractors}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showTotal: (total) => `Всего: ${total} контрагентов`
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
            name="name"
            label="Название компании"
            rules={[{ required: true, message: 'Укажите название компании' }]}
          >
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Input />
              <Space size={8} wrap>
                {['ООО', 'ИП', 'АО'].map((prefix) => (
                  <Button
                    key={prefix}
                    type="button"
                    size="small"
                    onClick={() => handlePrefixClick(prefix)}
                  >
                    {prefix}
                  </Button>
                ))}
              </Space>
            </Space>
          </Form.Item>


          <Form.Item
            name="type_id"
            label="Тип контрагента"
            rules={[{ required: true, message: 'Выберите тип контрагента' }]}
          >
            <Select placeholder="Выберите тип">
              {contractorTypes.map(type => (
                <Select.Option key={type.id} value={type.id}>
                  {type.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="inn"
            label="ИНН"
            rules={[
              { pattern: /^\d{10}$|^\d{12}$/, message: 'ИНН должен содержать 10 или 12 цифр' }
            ]}
          >
            <Input placeholder="10 или 12 цифр" maxLength={12} />
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
    </>
  )
}