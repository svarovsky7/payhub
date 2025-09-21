import { useState, useEffect } from 'react'
import { Table, Space, Button, Modal, Form, Input, InputNumber, Select, App, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase, type PaymentStatus } from '../../lib/supabase'

export const PaymentStatusesTab = () => {
  const { message: messageApi, modal } = App.useApp()
  const [paymentStatuses, setPaymentStatuses] = useState<PaymentStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingStatus, setEditingStatus] = useState<PaymentStatus | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadPaymentStatuses()
  }, [])

  const loadPaymentStatuses = async () => {
    console.log('[PaymentStatusesTab.loadPaymentStatuses] Loading payment statuses')
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('payment_statuses')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name')

      if (error) throw error

      console.log('[PaymentStatusesTab.loadPaymentStatuses] Loaded statuses:', data?.length || 0)
      setPaymentStatuses(data || [])
    } catch (error) {
      console.error('[PaymentStatusesTab.loadPaymentStatuses] Error:', error)
      messageApi.error('Ошибка загрузки статусов платежей')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    console.log('[PaymentStatusesTab.handleCreate] Opening create modal')
    setEditingStatus(null)
    form.resetFields()
    form.setFieldsValue({ sort_order: 100 })
    setIsModalVisible(true)
  }

  const handleEdit = (record: PaymentStatus) => {
    console.log('[PaymentStatusesTab.handleEdit] Editing status:', record.id)
    setEditingStatus(record)
    form.setFieldsValue(record)
    setIsModalVisible(true)
  }

  const handleSubmit = async (values: any) => {
    console.log('[PaymentStatusesTab.handleSubmit] Submitting:', values)
    try {
      if (editingStatus) {
        const { error } = await supabase
          .from('payment_statuses')
          .update(values)
          .eq('id', editingStatus.id)

        if (error) throw error
        messageApi.success('Статус платежа обновлён')
      } else {
        const { error } = await supabase
          .from('payment_statuses')
          .insert([values])

        if (error) throw error
        messageApi.success('Статус платежа создан')
      }

      setIsModalVisible(false)
      loadPaymentStatuses()
    } catch (error: any) {
      console.error('[PaymentStatusesTab.handleSubmit] Error:', error)
      if (error.code === '23505') {
        messageApi.error('Статус с таким кодом уже существует')
      } else {
        messageApi.error(error.message || 'Ошибка сохранения статуса платежа')
      }
    }
  }

  const handleDelete = async (id: number) => {
    console.log('[PaymentStatusesTab.handleDelete] Deleting status:', id)
    modal.confirm({
      title: 'Удалить статус платежа?',
      content: 'Это действие нельзя отменить. Все платежи с этим статусом останутся без статуса.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('payment_statuses')
            .delete()
            .eq('id', id)

          if (error) throw error
          messageApi.success('Статус платежа удалён')
          loadPaymentStatuses()
        } catch (error: any) {
          console.error('[PaymentStatusesTab.handleDelete] Error:', error)
          if (error.code === '23503') {
            messageApi.error('Невозможно удалить статус, так как он используется в платежах')
          } else {
            messageApi.error('Ошибка удаления статуса платежа')
          }
        }
      }
    })
  }

  const colorOptions = [
    { value: 'default', label: 'По умолчанию', color: 'default' },
    { value: 'success', label: 'Зелёный', color: 'success' },
    { value: 'processing', label: 'Синий', color: 'processing' },
    { value: 'warning', label: 'Оранжевый', color: 'warning' },
    { value: 'error', label: 'Красный', color: 'error' },
    { value: 'cyan', label: 'Голубой', color: 'cyan' },
    { value: 'purple', label: 'Фиолетовый', color: 'purple' },
    { value: 'magenta', label: 'Малиновый', color: 'magenta' },
    { value: 'gold', label: 'Золотой', color: 'gold' },
    { value: 'lime', label: 'Лайм', color: 'lime' }
  ]

  const columns: ColumnsType<PaymentStatus> = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 150
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: PaymentStatus) => (
        <Tag color={record.color || 'default'}>{name}</Tag>
      )
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: 'Порядок',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 100,
      align: 'center'
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
          Добавить статус платежа
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={paymentStatuses}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showTotal: (total) => `Всего: ${total} статусов`
        }}
      />

      <Modal
        title={editingStatus ? 'Редактировать статус платежа' : 'Создать статус платежа'}
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
              { required: true, message: 'Укажите код статуса' },
              { pattern: /^[a-z_]+$/, message: 'Код должен содержать только латинские буквы и подчеркивание' }
            ]}
          >
            <Input placeholder="например: pending" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Укажите название статуса' }]}
          >
            <Input placeholder="Название статуса" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea rows={3} placeholder="Описание статуса" />
          </Form.Item>

          <Form.Item
            name="color"
            label="Цвет"
          >
            <Select placeholder="Выберите цвет для статуса">
              {colorOptions.map(option => (
                <Select.Option key={option.value} value={option.value}>
                  <Space>
                    <Tag color={option.color}>{option.label}</Tag>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="sort_order"
            label="Порядок сортировки"
            tooltip="Статусы с меньшим числом показываются первыми"
          >
            <InputNumber
              min={0}
              max={1000}
              style={{ width: '100%' }}
              placeholder="100"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit">
                {editingStatus ? 'Обновить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}