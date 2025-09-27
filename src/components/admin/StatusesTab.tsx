import { useState, useEffect } from 'react'
import { Table, Space, Button, Modal, Form, Input, InputNumber, Select, App, Tag, Tabs } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase, type InvoiceStatus, type PaymentStatus } from '../../lib/supabase'
import { type ContractStatus } from '../../services/contractOperations'

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

  // Состояния для статусов договоров
  const [contractStatuses, setContractStatuses] = useState<ContractStatus[]>([])
  const [loadingContract, setLoadingContract] = useState(false)
  const [isContractModalVisible, setIsContractModalVisible] = useState(false)
  const [editingContractStatus, setEditingContractStatus] = useState<ContractStatus | null>(null)
  const [contractForm] = Form.useForm()

  useEffect(() => {
    loadInvoiceStatuses()
    loadPaymentStatuses()
    loadContractStatuses()
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

  // Функции для статусов договоров
  const loadContractStatuses = async () => {
    setLoadingContract(true)
    try {
      const { data, error } = await supabase
        .from('contract_statuses')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name')

      if (error) throw error

      setContractStatuses(data || [])
    } catch (error) {
      console.error('[StatusesTab.loadContractStatuses] Error:', error)
      messageApi.error('Ошибка загрузки статусов договоров')
    } finally {
      setLoadingContract(false)
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

  const handleCreateContract = () => {
    setEditingContractStatus(null)
    contractForm.resetFields()
    contractForm.setFieldsValue({ sort_order: 100 })
    setIsContractModalVisible(true)
  }

  const handleEditContract = (record: ContractStatus) => {
    setEditingContractStatus(record)

    // Map hex colors back to tag names for editing
    const hexToTag: { [key: string]: string } = {
      '#d9d9d9': 'default',
      '#52c41a': 'success',
      '#1890ff': 'processing',
      '#faad14': 'warning',
      '#f5222d': 'error',
      '#13c2c2': 'cyan',
      '#722ed1': 'purple',
      '#eb2f96': 'magenta',
      '#a0d911': 'lime'
    }

    const colorValue = record.color
      ? (hexToTag[record.color.toLowerCase()] || 'default')
      : 'default'

    contractForm.setFieldsValue({
      code: record.code,
      name: record.name,
      color: colorValue,
      description: record.description,
      sort_order: record.sort_order || 100
    })
    setIsContractModalVisible(true)
  }

  const handleSubmitContract = async (values: any) => {
    try {
      // Convert color from tag name to hex if needed for contract statuses
      const colorMapping: { [key: string]: string } = {
        'default': '#d9d9d9',
        'success': '#52c41a',
        'processing': '#1890ff',
        'warning': '#faad14',
        'error': '#f5222d',
        'cyan': '#13c2c2',
        'purple': '#722ed1',
        'magenta': '#eb2f96',
        'gold': '#faad14',
        'lime': '#a0d911'
      }

      const submitData = {
        ...values,
        color: colorMapping[values.color] || values.color || '#1890ff'
      }

      if (editingContractStatus) {
        const { error } = await supabase
          .from('contract_statuses')
          .update(submitData)
          .eq('id', editingContractStatus.id)

        if (error) throw error
        messageApi.success('Статус договора обновлён')
      } else {
        const { error } = await supabase
          .from('contract_statuses')
          .insert([submitData])

        if (error) throw error
        messageApi.success('Статус договора создан')
      }

      setIsContractModalVisible(false)
      loadContractStatuses()
    } catch (error: any) {
      console.error('[StatusesTab.handleSubmitContract] Error:', error)
      if (error.code === '23505') {
        messageApi.error('Статус с таким кодом уже существует')
      } else {
        messageApi.error(error.message || 'Ошибка сохранения статуса договора')
      }
    }
  }

  const handleDeleteContract = async (id: number) => {
    modal.confirm({
      title: 'Удалить статус договора?',
      content: 'Это действие нельзя отменить.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          // Проверяем, используется ли статус в договорах
          const { data: contracts, error: checkError } = await supabase
            .from('contracts')
            .select('id')
            .eq('status_id', id)
            .limit(1)

          if (checkError) throw checkError

          if (contracts && contracts.length > 0) {
            messageApi.error('Невозможно удалить статус, который используется в договорах')
            return
          }

          const { error } = await supabase
            .from('contract_statuses')
            .delete()
            .eq('id', id)

          if (error) throw error
          messageApi.success('Статус договора удалён')
          loadContractStatuses()
        } catch (error: any) {
          console.error('[StatusesTab.handleDeleteContract] Error:', error)
          messageApi.error('Ошибка удаления статуса договора')
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

  // Унифицированные колонки для всех статусов
  const getColumns = (type: 'invoice' | 'payment' | 'contract'): ColumnsType<any> => [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code'
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => {
        // For contract statuses, map hex colors to tag colors
        let tagColor = record.color || 'default'
        if (type === 'contract' && record.color && record.color.startsWith('#')) {
          const hexToTag: { [key: string]: string } = {
            '#d9d9d9': 'default',
            '#52c41a': 'success',
            '#1890ff': 'processing',
            '#faad14': 'warning',
            '#f5222d': 'error',
            '#13c2c2': 'cyan',
            '#722ed1': 'purple',
            '#eb2f96': 'magenta',
            '#a0d911': 'lime'
          }
          tagColor = hexToTag[record.color.toLowerCase()] || 'default'
        }
        return <Tag color={tagColor}>{name}</Tag>
      }
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
      align: 'center',
      render: (sort_order) => sort_order || '-'
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => date ? new Date(date).toLocaleDateString('ru-RU') : '-'
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => {
        const handleEdit = () => {
          if (type === 'invoice') handleEditInvoice(record)
          else if (type === 'payment') handleEditPayment(record)
          else if (type === 'contract') handleEditContract(record)
        }

        const handleDelete = () => {
          if (type === 'invoice') handleDeleteInvoice(record.id)
          else if (type === 'payment') handleDeletePayment(record.id)
          else if (type === 'contract') handleDeleteContract(record.id)
        }

        // Защищаем только системные статусы договоров от удаления
        const isProtected = false // Разрешаем удаление всех статусов

        return (
          <Space size="small">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={handleEdit}
            />
            <Button
              icon={<DeleteOutlined />}
              size="small"
              danger
              disabled={isProtected}
              onClick={handleDelete}
            />
          </Space>
        )
      }
    }
  ]


  // Унифицированный компонент формы для всех статусов
  const StatusForm = ({ form, onSubmit, isEditing, type }: any) => {
    const handleCancel = () => {
      if (type === 'invoice') setIsInvoiceModalVisible(false)
      else if (type === 'payment') setIsPaymentModalVisible(false)
      else if (type === 'contract') setIsContractModalVisible(false)
    }

    // Разрешаем редактирование кода для всех статусов договоров
    const isCodeDisabled = false // Разрешаем редактирование кода для всех статусов

    return (
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
          <Input
            placeholder="например: pending"
            disabled={isCodeDisabled}
          />
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
            <Button onClick={handleCancel}>
              Отмена
            </Button>
            <Button type="primary" htmlType="submit">
              {isEditing ? 'Обновить' : 'Создать'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    )
  }

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
    },
    {
      key: 'contract-statuses',
      label: 'Статусы договоров',
      children: (
        <>
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateContract}
            >
              Добавить статус договора
            </Button>
          </div>

          <Table
            columns={getColumns('contract')}
            dataSource={contractStatuses}
            loading={loadingContract}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showTotal: (total) => `Всего: ${total} статусов`
            }}
          />

          <Modal
            title={editingContractStatus ? 'Редактировать статус договора' : 'Создать статус договора'}
            open={isContractModalVisible}
            onCancel={() => setIsContractModalVisible(false)}
            footer={null}
            width={500}
          >
            <StatusForm
              form={contractForm}
              onSubmit={handleSubmitContract}
              isEditing={!!editingContractStatus}
              type="contract"
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