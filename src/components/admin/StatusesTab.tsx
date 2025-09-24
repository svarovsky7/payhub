import { useState, useEffect } from 'react'
import { Table, Space, Button, Modal, Form, Input, InputNumber, Select, App, Tag, Tabs } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase, type InvoiceStatus, type PaymentStatus } from '../../lib/supabase'

export const StatusesTab = () => {
  const { message: messageApi, modal } = App.useApp()

  // Состояния для статусов счетов
  const [invoiceStatuses, setInvoiceStatuses] = useState<InvoiceStatus[]>([])
  const [loadingInvoice, setLoadingInvoice] = useState(false)
  const [isInvoiceModalVisible, setIsInvoiceModalVisible] = useState(false)
  const [editingInvoiceStatus, setEditingInvoiceStatus] = useState<InvoiceStatus | null>(null)
  const [invoiceForm] = Form.useForm()

  // Состояния для статусов платежей
  const [paymentStatuses, setPaymentStatuses] = useState<PaymentStatus[]>([])
  const [loadingPayment, setLoadingPayment] = useState(false)
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false)
  const [editingPaymentStatus, setEditingPaymentStatus] = useState<PaymentStatus | null>(null)
  const [paymentForm] = Form.useForm()

  useEffect(() => {
    loadInvoiceStatuses()
    loadPaymentStatuses()
  }, [])

  // Функции для статусов счетов
  const loadInvoiceStatuses = async () => {
    setLoadingInvoice(true)
    try {
      const { data, error } = await supabase
        .from('invoice_statuses')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name')

      if (error) throw error

      setInvoiceStatuses(data || [])
    } catch (error) {
      console.error('[StatusesTab.loadInvoiceStatuses] Error:', error)
      messageApi.error('Ошибка загрузки статусов счетов')
    } finally {
      setLoadingInvoice(false)
    }
  }

  const handleCreateInvoice = () => {
    setEditingInvoiceStatus(null)
    invoiceForm.resetFields()
    invoiceForm.setFieldsValue({ sort_order: 100 })
    setIsInvoiceModalVisible(true)
  }

  const handleEditInvoice = (record: InvoiceStatus) => {
    setEditingInvoiceStatus(record)
    invoiceForm.setFieldsValue(record)
    setIsInvoiceModalVisible(true)
  }

  const handleSubmitInvoice = async (values: any) => {
    try {
      if (editingInvoiceStatus) {
        const { error } = await supabase
          .from('invoice_statuses')
          .update(values)
          .eq('id', editingInvoiceStatus.id)

        if (error) throw error
        messageApi.success('Статус счёта обновлён')
      } else {
        const { error } = await supabase
          .from('invoice_statuses')
          .insert([values])

        if (error) throw error
        messageApi.success('Статус счёта создан')
      }

      setIsInvoiceModalVisible(false)
      loadInvoiceStatuses()
    } catch (error: any) {
      console.error('[StatusesTab.handleSubmitInvoice] Error:', error)
      if (error.code === '23505') {
        messageApi.error('Статус с таким кодом уже существует')
      } else {
        messageApi.error(error.message || 'Ошибка сохранения статуса счёта')
      }
    }
  }

  const handleDeleteInvoice = async (id: number) => {
    modal.confirm({
      title: 'Удалить статус счёта?',
      content: 'Это действие нельзя отменить. Все счета с этим статусом останутся без статуса.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('invoice_statuses')
            .delete()
            .eq('id', id)

          if (error) throw error
          messageApi.success('Статус счёта удалён')
          loadInvoiceStatuses()
        } catch (error: any) {
          console.error('[StatusesTab.handleDeleteInvoice] Error:', error)
          if (error.code === '23503') {
            messageApi.error('Невозможно удалить статус, так как он используется в счетах')
          } else {
            messageApi.error('Ошибка удаления статуса счёта')
          }
        }
      }
    })
  }

  // Функции для статусов платежей
  const loadPaymentStatuses = async () => {
    setLoadingPayment(true)
    try {
      const { data, error } = await supabase
        .from('payment_statuses')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name')

      if (error) throw error

      setPaymentStatuses(data || [])
    } catch (error) {
      console.error('[StatusesTab.loadPaymentStatuses] Error:', error)
      messageApi.error('Ошибка загрузки статусов платежей')
    } finally {
      setLoadingPayment(false)
    }
  }

  const handleCreatePayment = () => {
    setEditingPaymentStatus(null)
    paymentForm.resetFields()
    paymentForm.setFieldsValue({ sort_order: 100 })
    setIsPaymentModalVisible(true)
  }

  const handleEditPayment = (record: PaymentStatus) => {
    setEditingPaymentStatus(record)
    paymentForm.setFieldsValue(record)
    setIsPaymentModalVisible(true)
  }

  const handleSubmitPayment = async (values: any) => {
    try {
      if (editingPaymentStatus) {
        const { error } = await supabase
          .from('payment_statuses')
          .update(values)
          .eq('id', editingPaymentStatus.id)

        if (error) throw error
        messageApi.success('Статус платежа обновлён')
      } else {
        const { error } = await supabase
          .from('payment_statuses')
          .insert([values])

        if (error) throw error
        messageApi.success('Статус платежа создан')
      }

      setIsPaymentModalVisible(false)
      loadPaymentStatuses()
    } catch (error: any) {
      console.error('[StatusesTab.handleSubmitPayment] Error:', error)
      if (error.code === '23505') {
        messageApi.error('Статус с таким кодом уже существует')
      } else {
        messageApi.error(error.message || 'Ошибка сохранения статуса платежа')
      }
    }
  }

  const handleDeletePayment = async (id: number) => {
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
          console.error('[StatusesTab.handleDeletePayment] Error:', error)
          if (error.code === '23503') {
            messageApi.error('Невозможно удалить статус, так как он используется в платежах')
          } else {
            messageApi.error('Ошибка удаления статуса платежа')
          }
        }
      }
    })
  }

  // Опции цветов для статусов
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

  // Унифицированные колонки для обеих таблиц
  const getColumns = (type: 'invoice' | 'payment'): ColumnsType<InvoiceStatus | PaymentStatus> => [
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
      render: (name: string, record: any) => (
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
            onClick={() => type === 'invoice' ? handleEditInvoice(record as InvoiceStatus) : handleEditPayment(record as PaymentStatus)}
          />
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => type === 'invoice' ? handleDeleteInvoice(record.id) : handleDeletePayment(record.id)}
          />
        </Space>
      )
    }
  ]

  // Компонент формы статуса
  const StatusForm = ({ form, onSubmit, isEditing, type }: any) => (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
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
          <Button onClick={() => type === 'invoice' ? setIsInvoiceModalVisible(false) : setIsPaymentModalVisible(false)}>
            Отмена
          </Button>
          <Button type="primary" htmlType="submit">
            {isEditing ? 'Обновить' : 'Создать'}
          </Button>
        </Space>
      </Form.Item>
    </Form>
  )

  const tabItems = [
    {
      key: 'invoice-statuses',
      label: 'Статусы счетов',
      children: (
        <>
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateInvoice}
            >
              Добавить статус счёта
            </Button>
          </div>

          <Table
            columns={getColumns('invoice')}
            dataSource={invoiceStatuses}
            loading={loadingInvoice}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showTotal: (total) => `Всего: ${total} статусов`
            }}
          />

          <Modal
            title={editingInvoiceStatus ? 'Редактировать статус счёта' : 'Создать статус счёта'}
            open={isInvoiceModalVisible}
            onCancel={() => setIsInvoiceModalVisible(false)}
            footer={null}
            width={500}
          >
            <StatusForm
              form={invoiceForm}
              onSubmit={handleSubmitInvoice}
              isEditing={!!editingInvoiceStatus}
              type="invoice"
            />
          </Modal>
        </>
      )
    },
    {
      key: 'payment-statuses',
      label: 'Статусы платежей',
      children: (
        <>
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreatePayment}
            >
              Добавить статус платежа
            </Button>
          </div>

          <Table
            columns={getColumns('payment')}
            dataSource={paymentStatuses}
            loading={loadingPayment}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showTotal: (total) => `Всего: ${total} статусов`
            }}
          />

          <Modal
            title={editingPaymentStatus ? 'Редактировать статус платежа' : 'Создать статус платежа'}
            open={isPaymentModalVisible}
            onCancel={() => setIsPaymentModalVisible(false)}
            footer={null}
            width={500}
          >
            <StatusForm
              form={paymentForm}
              onSubmit={handleSubmitPayment}
              isEditing={!!editingPaymentStatus}
              type="payment"
            />
          </Modal>
        </>
      )
    }
  ]

  return (
    <Tabs
      defaultActiveKey="invoice-statuses"
      items={tabItems}
    />
  )
}