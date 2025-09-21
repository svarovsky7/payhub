import { useState, useEffect } from 'react'
import { Table, Button, Space, Tag, Modal, Form, Input, InputNumber, Select, DatePicker, Radio, message, Row, Col } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { supabase, type Invoice, type Contractor, type Project, type InvoiceType } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export const InvoicesPage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [payers, setPayers] = useState<Contractor[]>([])
  const [suppliers, setSuppliers] = useState<Contractor[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [invoiceTypes, setInvoiceTypes] = useState<InvoiceType[]>([])
  const [amountWithVat, setAmountWithVat] = useState<number>(0)
  const [vatRate, setVatRate] = useState<number>(20)
  const [vatAmount, setVatAmount] = useState<number>(0)
  const [amountWithoutVat, setAmountWithoutVat] = useState<number>(0)
  const [form] = Form.useForm()
  const { user } = useAuth()

  useEffect(() => {
    loadInvoices()
    loadReferences()
  }, [])

  useEffect(() => {
    calculateVat()
  }, [amountWithVat, vatRate])

  const calculateVat = () => {
    console.log('[InvoicesPage.calculateVat] Calculating VAT:', { amountWithVat, vatRate })
    if (vatRate === 0) {
      setVatAmount(0)
      setAmountWithoutVat(amountWithVat)
    } else {
      const vat = Math.round((amountWithVat * vatRate / (100 + vatRate)) * 100) / 100
      setVatAmount(vat)
      setAmountWithoutVat(amountWithVat - vat)
    }
  }

  const loadReferences = async () => {
    console.log('[InvoicesPage.loadReferences] Loading reference data')
    try {
      // Загрузка плательщиков
      const { data: payersData } = await supabase
        .from('contractors')
        .select('*, contractor_types!inner(code)')
        .eq('contractor_types.code', 'payer')
        .order('name')

      setPayers(payersData || [])
      console.log('[InvoicesPage.loadReferences] Loaded payers:', payersData?.length || 0)

      // Загрузка поставщиков
      const { data: suppliersData } = await supabase
        .from('contractors')
        .select('*, contractor_types!inner(code)')
        .eq('contractor_types.code', 'supplier')
        .order('name')

      setSuppliers(suppliersData || [])
      console.log('[InvoicesPage.loadReferences] Loaded suppliers:', suppliersData?.length || 0)

      // Загрузка проектов
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .eq('is_active', true)
        .order('name')

      setProjects(projectsData || [])
      console.log('[InvoicesPage.loadReferences] Loaded projects:', projectsData?.length || 0)

      // Загрузка типов счетов
      const { data: typesData } = await supabase
        .from('invoice_types')
        .select('*')
        .order('name')

      setInvoiceTypes(typesData || [])
      console.log('[InvoicesPage.loadReferences] Loaded invoice types:', typesData?.length || 0)
    } catch (error) {
      console.error('[InvoicesPage.loadReferences] Error:', error)
      message.error('Ошибка загрузки справочных данных')
    }
  }

  const loadInvoices = async () => {
    console.log('[InvoicesPage.loadInvoices] Loading invoices')
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          payer:contractors!invoices_payer_id_fkey(id, name),
          supplier:contractors!invoices_supplier_id_fkey(id, name),
          project:projects(id, name),
          invoice_type:invoice_types(id, name)
        `)
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
    setAmountWithVat(0)
    setVatRate(20)
    setVatAmount(0)
    setAmountWithoutVat(0)
    form.setFieldsValue({
      vat_rate: 20,
      delivery_days_type: 'working',
      status: 'draft',
      invoice_date: dayjs()
    })
    setIsModalVisible(true)
  }

  const handleSubmit = async (values: any) => {
    console.log('[InvoicesPage.handleSubmit] Creating invoice:', values)
    try {
      const invoiceData = {
        user_id: user?.id,
        invoice_number: values.invoice_number || 'б/н',
        invoice_date: values.invoice_date.format('YYYY-MM-DD'),
        payer_id: values.payer_id,
        supplier_id: values.supplier_id,
        project_id: values.project_id,
        invoice_type_id: values.invoice_type_id,
        amount_with_vat: amountWithVat,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        amount_without_vat: amountWithoutVat,
        amount: amountWithVat, // для совместимости
        delivery_days: values.delivery_days,
        delivery_days_type: values.delivery_days_type,
        status: values.status || 'draft',
        description: values.description,
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null
      }

      const { error } = await supabase.from('invoices').insert([invoiceData])

      if (error) throw error

      message.success('Счет создан успешно')
      setIsModalVisible(false)
      loadInvoices()
    } catch (error: any) {
      console.error('[InvoicesPage.handleSubmit] Error:', error)
      message.error(error.message || 'Ошибка создания счета')
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
      title: 'Номер',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      width: 100
    },
    {
      title: 'Дата',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      width: 100,
      render: (date) => date ? new Date(date).toLocaleDateString('ru-RU') : '-'
    },
    {
      title: 'Плательщик',
      dataIndex: ['payer', 'name'],
      key: 'payer',
      width: 150,
      ellipsis: true
    },
    {
      title: 'Поставщик',
      dataIndex: ['supplier', 'name'],
      key: 'supplier',
      width: 150,
      ellipsis: true
    },
    {
      title: 'Проект',
      dataIndex: ['project', 'name'],
      key: 'project',
      width: 120,
      ellipsis: true
    },
    {
      title: 'Тип',
      dataIndex: ['invoice_type', 'name'],
      key: 'invoice_type',
      width: 100
    },
    {
      title: 'Сумма с НДС',
      dataIndex: 'amount_with_vat',
      key: 'amount_with_vat',
      width: 120,
      render: (amount) => amount ? `${amount?.toLocaleString('ru-RU')} ₽` : '-'
    },
    {
      title: 'НДС',
      dataIndex: 'vat_rate',
      key: 'vat_rate',
      width: 60,
      render: (rate) => `${rate || 0}%`
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status)
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      fixed: 'right',
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
        scroll={{ x: 1200 }}
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
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="invoice_number"
                label="Номер счета"
              >
                <Input placeholder="б/н (если не заполнено)" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="invoice_date"
                label="Дата счета"
                rules={[{ required: true, message: 'Выберите дату счета' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="payer_id"
                label="Плательщик"
                rules={[{ required: true, message: 'Выберите плательщика' }]}
              >
                <Select
                  placeholder="Выберите плательщика"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={payers.map(p => ({
                    value: p.id,
                    label: p.name
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="supplier_id"
                label="Поставщик материалов"
                rules={[{ required: true, message: 'Выберите поставщика' }]}
              >
                <Select
                  placeholder="Выберите поставщика"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={suppliers.map(s => ({
                    value: s.id,
                    label: s.name
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="project_id"
                label="Проект"
                rules={[{ required: true, message: 'Выберите проект' }]}
              >
                <Select
                  placeholder="Выберите проект"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={projects.map(p => ({
                    value: p.id,
                    label: p.name
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="invoice_type_id"
                label="Тип счета"
                rules={[{ required: true, message: 'Выберите тип счета' }]}
              >
                <Select
                  placeholder="Выберите тип счета"
                  options={invoiceTypes.map(t => ({
                    value: t.id,
                    label: t.name
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Сумма счета с НДС" required>
                <InputNumber
                  style={{ width: '100%' }}
                  value={amountWithVat}
                  onChange={(value) => setAmountWithVat(value || 0)}
                  min={0}
                  formatter={value => `₽ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => parseFloat(value!.replace(/₽\s?|(,*)/g, ''))}
                />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item
                name="vat_rate"
                label="НДС"
                rules={[{ required: true, message: 'Выберите НДС' }]}
              >
                <Select onChange={setVatRate}>
                  <Select.Option value={0}>0%</Select.Option>
                  <Select.Option value={3}>3%</Select.Option>
                  <Select.Option value={5}>5%</Select.Option>
                  <Select.Option value={7}>7%</Select.Option>
                  <Select.Option value={20}>20%</Select.Option>
                  <Select.Option value={22}>22%</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Сумма НДС">
                <InputNumber
                  style={{ width: '100%' }}
                  value={vatAmount}
                  disabled
                  formatter={value => `₽ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Сумма без НДС">
                <InputNumber
                  style={{ width: '100%' }}
                  value={amountWithoutVat}
                  disabled
                  formatter={value => `₽ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="delivery_days"
                label="Срок поставки (дней)"
              >
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="delivery_days_type"
                label="Тип дней"
              >
                <Radio.Group>
                  <Radio value="working">Рабочие</Radio>
                  <Radio value="calendar">Календарные</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="due_date"
                label="Срок оплаты"
              >
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea rows={3} />
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