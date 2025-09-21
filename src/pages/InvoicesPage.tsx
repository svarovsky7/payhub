import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, InputNumber, Select, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { supabase, type Invoice } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export const InvoicesPage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [form] = Form.useForm()
  const { user } = useAuth()

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    console.log('[InvoicesPage.loadInvoices] Loading invoices')
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('[InvoicesPage.loadInvoices] Loaded invoices:', data?.length || 0)
      setInvoices(data || [])
    } catch (error) {
      console.error('[InvoicesPage.loadInvoices] Error:', error)
      message.error('Ошибка загрузки счетов')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    console.log('[InvoicesPage.handleCreate] Opening create modal')
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleSubmit = async (values: any) => {
    console.log('[InvoicesPage.handleSubmit] Creating invoice:', values)
    try {
      const { error } = await supabase.from('invoices').insert([{
        user_id: user?.id,
        invoice_number: values.invoice_number,
        amount: values.amount,
        status: values.status || 'draft'
      }])

      if (error) throw error

      message.success('Счет создан успешно')
      setIsModalVisible(false)
      loadInvoices()
    } catch (error) {
      console.error('[InvoicesPage.handleSubmit] Error:', error)
      message.error('Ошибка создания счета')
    }
  }

  const handleDelete = async (id: string) => {
    console.log('[InvoicesPage.handleDelete] Deleting invoice:', id)
    Modal.confirm({
      title: 'Удалить счет?',
      content: 'Это действие нельзя отменить',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('invoices')
            .delete()
            .eq('id', id)

          if (error) throw error

          message.success('Счет удален')
          loadInvoices()
        } catch (error) {
          console.error('[InvoicesPage.handleDelete] Error:', error)
          message.error('Ошибка удаления счета')
        }
      }
    })
  }

  const getStatusTag = (status: string) => {
    const statusConfig = {
      draft: { color: 'default', text: 'Черновик' },
      sent: { color: 'processing', text: 'Отправлен' },
      paid: { color: 'success', text: 'Оплачен' },
      cancelled: { color: 'error', text: 'Отменен' }
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    return <Tag color={config.color}>{config.text}</Tag>
  }

  const columns: ColumnsType<Invoice> = [
    {
      title: 'Номер счета',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      width: 150
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount) => `${amount?.toLocaleString('ru-RU')} ₽`
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => getStatusTag(status)
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date) => new Date(date).toLocaleDateString('ru-RU')
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button icon={<EyeOutlined />} size="small" />
          <Button icon={<EditOutlined />} size="small" />
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>Счета</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Создать новый счет
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={invoices}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showTotal: (total) => `Всего: ${total} счетов`
        }}
      />

      <Modal
        title="Создать новый счет"
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
            name="invoice_number"
            label="Номер счета"
            rules={[{ required: true, message: 'Введите номер счета' }]}
          >
            <Input placeholder="Например: INV-001" />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Сумма"
            rules={[{ required: true, message: 'Введите сумму' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="0"
              formatter={value => `₽ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value!.replace(/₽\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="Статус"
            initialValue="draft"
          >
            <Select>
              <Select.Option value="draft">Черновик</Select.Option>
              <Select.Option value="sent">Отправлен</Select.Option>
              <Select.Option value="paid">Оплачен</Select.Option>
              <Select.Option value="cancelled">Отменен</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                Отмена
              </Button>
              <Button type="primary" htmlType="submit">
                Создать
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}