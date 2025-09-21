import { useState, useEffect } from 'react'
import { Table, Space, Button, Modal, Form, Input, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase, type ContractorType } from '../../lib/supabase'

export const ContractorTypesTab = () => {
  const [contractorTypes, setContractorTypes] = useState<ContractorType[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingType, setEditingType] = useState<ContractorType | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadContractorTypes()
  }, [])

  const loadContractorTypes = async () => {
    console.log('[ContractorTypesTab.loadContractorTypes] Loading contractor types')
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('contractor_types')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('[ContractorTypesTab.loadContractorTypes] Loaded types:', data?.length || 0)
      setContractorTypes(data || [])
    } catch (error) {
      console.error('[ContractorTypesTab.loadContractorTypes] Error:', error)
      message.error('Ошибка загрузки типов контрагентов')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    console.log('[ContractorTypesTab.handleCreate] Opening create modal')
    setEditingType(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (record: ContractorType) => {
    console.log('[ContractorTypesTab.handleEdit] Editing type:', record.id)
    setEditingType(record)
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const handleSubmit = async (values: any) => {
    console.log('[ContractorTypesTab.handleSubmit] Submitting:', values)
    try {
      if (editingType) {
        const { error } = await supabase
          .from('contractor_types')
          .update(values)
          .eq('id', editingType.id)

        if (error) throw error
        message.success('Тип контрагента обновлен')
      } else {
        const { error } = await supabase
          .from('contractor_types')
          .insert([values])

        if (error) throw error
        message.success('Тип контрагента создан')
      }

      setIsModalVisible(false)
      loadContractorTypes()
    } catch (error: any) {
      console.error('[ContractorTypesTab.handleSubmit] Error:', error)
      message.error(error.message || 'Ошибка сохранения типа контрагента')
    }
  }

  const handleDelete = async (id: number) => {
    console.log('[ContractorTypesTab.handleDelete] Deleting type:', id)
    Modal.confirm({
      title: 'Удалить тип контрагента?',
      content: 'Это действие нельзя отменить. Все контрагенты этого типа также будут затронуты.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('contractor_types')
            .delete()
            .eq('id', id)

          if (error) throw error
          message.success('Тип контрагента удален')
          loadContractorTypes()
        } catch (error) {
          console.error('[ContractorTypesTab.handleDelete] Error:', error)
          message.error('Ошибка удаления типа контрагента')
        }
      }
    })
  }

  const columns: ColumnsType<ContractorType> = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 120
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description'
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
          Добавить тип контрагента
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={contractorTypes}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showTotal: (total) => `Всего: ${total} типов`
        }}
      />

      <Modal
        title={editingType ? 'Редактировать тип контрагента' : 'Создать тип контрагента'}
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
            name="code"
            label="Код"
            rules={[
              { required: true, message: 'Введите код типа' },
              { max: 50, message: 'Максимум 50 символов' }
            ]}
          >
            <Input placeholder="Например: supplier" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название типа' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit">
                {editingType ? 'Обновить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}