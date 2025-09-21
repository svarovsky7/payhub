import { useState, useEffect } from 'react'
import { Table, Space, Button, Modal, Form, Input, message, App } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase, type PaymentType } from '../../lib/supabase'

export const PaymentTypesTab = () => {
  const { message: messageApi, modal } = App.useApp()
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingType, setEditingType] = useState<PaymentType | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadPaymentTypes()
  }, [])

  const loadPaymentTypes = async () => {
    console.log('[PaymentTypesTab.loadPaymentTypes] Loading payment types')
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('payment_types')
        .select('*')
        .order('name')

      if (error) throw error

      console.log('[PaymentTypesTab.loadPaymentTypes] Loaded types:', data?.length || 0)
      setPaymentTypes(data || [])
    } catch (error) {
      console.error('[PaymentTypesTab.loadPaymentTypes] Error:', error)
      messageApi.error('Ошибка загрузки типов платежей')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    console.log('[PaymentTypesTab.handleCreate] Opening create modal')
    setEditingType(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (record: PaymentType) => {
    console.log('[PaymentTypesTab.handleEdit] Editing type:', record.id)
    setEditingType(record)
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const handleSubmit = async (values: any) => {
    console.log('[PaymentTypesTab.handleSubmit] Submitting:', values)
    try {
      if (editingType) {
        const { error } = await supabase
          .from('payment_types')
          .update(values)
          .eq('id', editingType.id)

        if (error) throw error
        messageApi.success('Тип платежа обновлен')
      } else {
        const { error } = await supabase
          .from('payment_types')
          .insert([values])

        if (error) throw error
        messageApi.success('Тип платежа создан')
      }

      setIsModalVisible(false)
      loadPaymentTypes()
    } catch (error: any) {
      console.error('[PaymentTypesTab.handleSubmit] Error:', error)
      messageApi.error(error.message || 'Ошибка сохранения типа платежа')
    }
  }

  const handleDelete = async (id: number) => {
    console.log('[PaymentTypesTab.handleDelete] Deleting type:', id)
    modal.confirm({
      title: 'Удалить тип платежа?',
      content: 'Это действие нельзя отменить',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('payment_types')
            .delete()
            .eq('id', id)

          if (error) throw error
          messageApi.success('Тип платежа удален')
          loadPaymentTypes()
        } catch (error: any) {
          console.error('[PaymentTypesTab.handleDelete] Error:', error)
          if (error.code === '23503') {
            messageApi.error('Невозможно удалить тип платежа, так как он используется')
          } else {
            messageApi.error('Ошибка удаления типа платежа')
          }
        }
      }
    })
  }

  const columns: ColumnsType<PaymentType> = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 150
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
          Добавить тип платежа
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={paymentTypes}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showTotal: (total) => `Всего: ${total} типов`
        }}
      />

      <Modal
        title={editingType ? 'Редактировать тип платежа' : 'Создать тип платежа'}
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
              { required: true, message: 'Укажите код типа' },
              { pattern: /^[a-z_]+$/, message: 'Код должен содержать только латинские буквы и подчеркивание' }
            ]}
          >
            <Input placeholder="например: bank_transfer" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Укажите название типа' }]}
          >
            <Input placeholder="Название типа платежа" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea rows={3} placeholder="Описание типа платежа" />
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