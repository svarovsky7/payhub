import { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Radio,
  Row,
  Col,
  Space,
  Button,
  Divider,
  Typography,
  FloatButton,
  Tabs,
  Table,
  Empty,
  message
} from 'antd'
import { SaveOutlined, CloseOutlined, EditOutlined, ArrowLeftOutlined, FileOutlined, DownloadOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { supabase } from '../../lib/supabase'
import type { Invoice, Contractor, Project, InvoiceType, InvoiceStatus } from '../../lib/supabase'
import { formatAmount, calculateDeliveryDate } from '../../utils/invoiceHelpers'

const { Title } = Typography

interface InvoiceViewProps {
  invoice: Invoice
  payers: Contractor[]
  suppliers: Contractor[]
  projects: Project[]
  invoiceTypes: InvoiceType[]
  invoiceStatuses: InvoiceStatus[]
  onUpdate: (invoiceId: string, values: any) => Promise<void>
  onClose: () => void
}

interface AttachmentData {
  id: string
  original_name: string
  storage_path: string
  size_bytes: number
  mime_type: string
  created_at: string
}

export const InvoiceView: React.FC<InvoiceViewProps> = ({
  invoice,
  payers,
  suppliers,
  projects,
  invoiceTypes,
  invoiceStatuses,
  onUpdate,
  onClose
}) => {
  const [form] = Form.useForm()
  const [isEditing, setIsEditing] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<AttachmentData[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)

  // VAT calculation states
  const [amountWithVat, setAmountWithVat] = useState<number>(invoice.amount_with_vat || 0)
  const [vatRate, setVatRate] = useState<number>(invoice.vat_rate || 20)
  const [vatAmount, setVatAmount] = useState<number>(invoice.vat_amount || 0)
  const [amountWithoutVat, setAmountWithoutVat] = useState<number>(invoice.amount_without_vat || 0)

  // Delivery date calculation states
  const [deliveryDays, setDeliveryDays] = useState<number | undefined>(invoice.delivery_days)
  const [deliveryDaysType, setDeliveryDaysType] = useState<'working' | 'calendar'>(
    invoice.delivery_days_type || 'calendar'
  )
  const [invoiceDate, setInvoiceDate] = useState<Dayjs>(
    invoice.invoice_date ? dayjs(invoice.invoice_date) : dayjs()
  )
  const [preliminaryDeliveryDate, setPreliminaryDeliveryDate] = useState<Dayjs | null>(
    invoice.preliminary_delivery_date ? dayjs(invoice.preliminary_delivery_date) : null
  )

  useEffect(() => {
    // Инициализация формы значениями счета
    form.setFieldsValue({
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date ? dayjs(invoice.invoice_date) : dayjs(),
      payer_id: invoice.payer_id,
      supplier_id: invoice.supplier_id,
      project_id: invoice.project_id,
      invoice_type_id: invoice.invoice_type_id,
      status_id: invoice.status_id,
      vat_rate: invoice.vat_rate || 20,
      delivery_days: invoice.delivery_days,
      delivery_days_type: invoice.delivery_days_type || 'calendar',
      description: invoice.description
    })

    // Загружаем прикрепленные файлы
    loadAttachments()
  }, [invoice, form])

  useEffect(() => {
    calculateVat()
  }, [amountWithVat, vatRate])

  useEffect(() => {
    // Пересчитываем дату поставки при изменении параметров
    if (deliveryDays && deliveryDays > 0) {
      const calculatedDate = calculateDeliveryDate(invoiceDate, deliveryDays, deliveryDaysType)
      setPreliminaryDeliveryDate(calculatedDate)
    } else {
      setPreliminaryDeliveryDate(null)
    }
  }, [invoiceDate, deliveryDays, deliveryDaysType])

  const calculateVat = () => {
    if (vatRate === 0) {
      setVatAmount(0)
      setAmountWithoutVat(amountWithVat)
    } else {
      const vat = Math.round((amountWithVat * vatRate / (100 + vatRate)) * 100) / 100
      setVatAmount(vat)
      setAmountWithoutVat(amountWithVat - vat)
    }
  }

  const handleFormChange = () => {
    setHasChanges(true)
    setIsEditing(true)
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      const values = await form.validateFields()

      const updatedData = {
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
        delivery_days: deliveryDays,
        delivery_days_type: deliveryDaysType,
        preliminary_delivery_date: preliminaryDeliveryDate ? preliminaryDeliveryDate.format('YYYY-MM-DD') : null,
        status_id: values.status_id,
        description: values.description
      }

      await onUpdate(invoice.id, updatedData)

      setHasChanges(false)
      setIsEditing(false)
      message.success('Счет успешно обновлен')
    } catch (error) {
      console.error('[InvoiceView.handleSave] Error:', error)
      message.error('Ошибка при сохранении счета')
    } finally {
      setLoading(false)
    }
  }

  const loadAttachments = async () => {
    try {
      setLoadingAttachments(true)
      console.log('[InvoiceView.loadAttachments] Loading attachments for invoice:', invoice.id)

      const { data, error } = await supabase
        .from('invoice_attachments')
        .select(`
          attachment_id,
          attachments (
            id,
            original_name,
            storage_path,
            size_bytes,
            mime_type,
            created_at
          )
        `)
        .eq('invoice_id', invoice.id)

      if (error) {
        console.error('[InvoiceView.loadAttachments] Error:', error)
        message.error('Ошибка загрузки файлов')
        return
      }

      const attachmentList = data?.map(item => (item as any).attachments).filter(Boolean) || []
      console.log('[InvoiceView.loadAttachments] Loaded attachments:', attachmentList)
      setAttachments(attachmentList)
    } catch (error) {
      console.error('[InvoiceView.loadAttachments] Error:', error)
      message.error('Ошибка загрузки файлов')
    } finally {
      setLoadingAttachments(false)
    }
  }

  const handleDownload = async (attachment: AttachmentData) => {
    try {
      console.log('[InvoiceView.handleDownload] Downloading file:', attachment)

      const { data, error } = await supabase.storage
        .from('attachments')
        .download(attachment.storage_path)

      if (error) {
        console.error('[InvoiceView.handleDownload] Error:', error)
        message.error('Ошибка загрузки файла')
        return
      }

      // Создаем ссылку для скачивания
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.original_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      console.log('[InvoiceView.handleDownload] File downloaded successfully')
    } catch (error) {
      console.error('[InvoiceView.handleDownload] Error:', error)
      message.error('Ошибка загрузки файла')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleCancel = () => {
    // Сброс формы к исходным значениям
    form.setFieldsValue({
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date ? dayjs(invoice.invoice_date) : dayjs(),
      payer_id: invoice.payer_id,
      supplier_id: invoice.supplier_id,
      project_id: invoice.project_id,
      invoice_type_id: invoice.invoice_type_id,
      status_id: invoice.status_id,
      vat_rate: invoice.vat_rate || 20,
      delivery_days: invoice.delivery_days,
      delivery_days_type: invoice.delivery_days_type || 'calendar',
      description: invoice.description
    })

    // Сброс состояний
    setAmountWithVat(invoice.amount_with_vat || 0)
    setVatRate(invoice.vat_rate || 20)
    setDeliveryDays(invoice.delivery_days)
    setDeliveryDaysType(invoice.delivery_days_type || 'calendar')
    setInvoiceDate(invoice.invoice_date ? dayjs(invoice.invoice_date) : dayjs())

    setHasChanges(false)
    setIsEditing(false)
  }

  const mainInfoTab = (
    <Form
      form={form}
      layout="vertical"
      onValuesChange={handleFormChange}
      disabled={!isEditing}
    >
          <Row gutter={24}>
            <Col span={6}>
              <Form.Item
                name="invoice_number"
                label="Номер счета"
              >
                <Input placeholder="б/н" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="invoice_date"
                label="Дата счета"
                rules={[{ required: true, message: 'Выберите дату счета' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="DD.MM.YYYY"
                  onChange={(date) => setInvoiceDate(date || dayjs())}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="status_id"
                label="Статус"
                rules={[{ required: true, message: 'Выберите статус' }]}
              >
                <Select
                  placeholder="Выберите статус"
                  options={invoiceStatuses.map(s => ({
                    value: s.id,
                    label: s.name
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="invoice_type_id"
                label="Тип счета"
                rules={[{ required: true, message: 'Выберите тип счета' }]}
              >
                <Select
                  placeholder="Выберите тип"
                  options={invoiceTypes.map(t => ({
                    value: t.id,
                    label: t.name
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Контрагенты</Divider>

          <Row gutter={24}>
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

          <Row gutter={24}>
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
          </Row>

          <Divider>Суммы и НДС</Divider>

          <Row gutter={24}>
            <Col span={6}>
              <Form.Item label="Сумма счета с НДС" required>
                <InputNumber
                  style={{ width: '100%' }}
                  value={amountWithVat}
                  onChange={(value) => setAmountWithVat(value || 0)}
                  disabled={!isEditing}
                  min={0}
                  max={999999999.99}
                  precision={2}
                  decimalSeparator=","
                  formatter={(value) => {
                    if (!value) return ''
                    return `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ',')
                  }}
                  parser={(value) => {
                    if (!value) return 0
                    return parseFloat(value.replace(/\s/g, '').replace(',', '.')) || 0
                  }}
                  addonAfter="₽"
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="vat_rate"
                label="НДС"
                rules={[{ required: true, message: 'Выберите НДС' }]}
              >
                <Select onChange={setVatRate} disabled={!isEditing}>
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
                <Input
                  value={formatAmount(vatAmount)}
                  disabled
                  suffix="₽"
                  style={{ backgroundColor: '#f5f5f5' }}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Сумма без НДС">
                <Input
                  value={formatAmount(amountWithoutVat)}
                  disabled
                  suffix="₽"
                  style={{ backgroundColor: '#f5f5f5' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Сроки поставки</Divider>

          <Row gutter={24}>
            <Col span={6}>
              <Form.Item
                name="delivery_days"
                label="Срок поставки (дней)"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  onChange={(value) => setDeliveryDays(value || undefined)}
                  disabled={!isEditing}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="delivery_days_type"
                label="Тип дней"
              >
                <Radio.Group
                  onChange={(e) => setDeliveryDaysType(e.target.value)}
                  disabled={!isEditing}
                >
                  <Radio value="working">Рабочие</Radio>
                  <Radio value="calendar">Календарные</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Предварительная дата поставки">
                <Input
                  value={preliminaryDeliveryDate
                    ? `${preliminaryDeliveryDate.format('DD.MM.YYYY')} (${preliminaryDeliveryDate.format('dddd')})`
                    : 'Укажите срок поставки'}
                  disabled
                  style={{
                    backgroundColor: '#f5f5f5',
                    fontWeight: preliminaryDeliveryDate ? 'bold' : 'normal'
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={24}>
            <Col span={24}>
              <Form.Item
                name="description"
                label="Описание"
              >
                <Input.TextArea
                  rows={3}
                  disabled={!isEditing}
                />
              </Form.Item>
            </Col>
          </Row>
    </Form>
  )

  const attachmentsTab = (
    <div>
      {loadingAttachments ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Загрузка файлов...</div>
      ) : attachments.length > 0 ? (
        <Table
          dataSource={attachments}
          rowKey="id"
          columns={[
            {
              title: 'Название файла',
              dataIndex: 'original_name',
              key: 'original_name',
              render: (name) => (
                <Space>
                  <FileOutlined />
                  {name}
                </Space>
              )
            },
            {
              title: 'Размер',
              dataIndex: 'size_bytes',
              key: 'size_bytes',
              width: 120,
              render: (size) => formatFileSize(size)
            },
            {
              title: 'Тип файла',
              dataIndex: 'mime_type',
              key: 'mime_type',
              width: 150
            },
            {
              title: 'Дата загрузки',
              dataIndex: 'created_at',
              key: 'created_at',
              width: 180,
              render: (date) => new Date(date).toLocaleString('ru-RU')
            },
            {
              title: 'Действия',
              key: 'actions',
              width: 100,
              render: (_, record) => (
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownload(record)}
                  size="small"
                >
                  Скачать
                </Button>
              )
            }
          ]}
          pagination={false}
        />
      ) : (
        <Empty description="Нет прикрепленных файлов" />
      )}
    </div>
  )

  return (
    <>
      <Card
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={onClose}
              type="text"
            >
              Назад к списку
            </Button>
            <Divider type="vertical" />
            <Title level={4} style={{ margin: 0 }}>
              Счет № {invoice.invoice_number} от {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString('ru-RU') : '-'}
            </Title>
          </Space>
        }
        extra={
          !isEditing && (
            <Button
              icon={<EditOutlined />}
              onClick={() => setIsEditing(true)}
            >
              Редактировать
            </Button>
          )
        }
      >
        <Tabs
          defaultActiveKey="main"
          items={[
            {
              key: 'main',
              label: 'Основная информация',
              children: mainInfoTab
            },
            {
              key: 'attachments',
              label: `Прикрепленные файлы (${attachments.length})`,
              children: attachmentsTab
            }
          ]}
        />
      </Card>

      {/* Плавающие кнопки при наличии изменений */}
      {hasChanges && (
        <FloatButton.Group
          shape="square"
          style={{ right: 24, bottom: 24 }}
        >
          <FloatButton
            icon={<CloseOutlined />}
            tooltip="Отменить изменения"
            onClick={handleCancel}
          />
          <FloatButton
            type="primary"
            icon={<SaveOutlined />}
            tooltip="Сохранить изменения"
            onClick={handleSave}
            loading={loading}
          />
        </FloatButton.Group>
      )}
    </>
  )
}