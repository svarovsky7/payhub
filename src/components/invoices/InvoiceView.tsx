import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  Modal,
  message
} from 'antd'
import { SaveOutlined, CloseOutlined, EditOutlined, ArrowLeftOutlined, FileOutlined, DownloadOutlined, EyeOutlined, DeleteOutlined, PlusOutlined, DollarOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { supabase } from '../../lib/supabase'
import type { Invoice, Contractor, Project, InvoiceType, InvoiceStatus, Payment, PaymentType, PaymentStatus } from '../../lib/supabase'
import { formatAmount, calculateDeliveryDate } from '../../utils/invoiceHelpers'
import { PaymentFormModal } from './PaymentFormModal'
import { useAuth } from '../../contexts/AuthContext'
import type { ColumnsType } from 'antd/es/table'
import { Tag, App } from 'antd'

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
  const { message: messageApi, modal } = App.useApp()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [form] = Form.useForm()
  const [paymentForm] = Form.useForm()
  const [isEditing, setIsEditing] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<AttachmentData[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null)

  // Payment states
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([])
  const [paymentStatuses, setPaymentStatuses] = useState<PaymentStatus[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)

  // Получаем активную вкладку из URL, по умолчанию 'main'
  const activeTab = searchParams.get('tab') || 'main'

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

    // Загружаем прикрепленные файлы и платежи
    loadAttachments()
    loadPayments()
    loadPaymentReferences()
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

  const handlePreview = async (attachment: AttachmentData) => {
    try {
      console.log('[InvoiceView.handlePreview] Previewing file:', attachment)

      const { data, error } = await supabase.storage
        .from('attachments')
        .download(attachment.storage_path)

      if (error) {
        console.error('[InvoiceView.handlePreview] Error:', error)
        message.error('Ошибка загрузки файла для просмотра')
        return
      }

      // Создаем URL для предпросмотра
      const url = URL.createObjectURL(data)
      const mimeType = attachment.mime_type || ''
      const fileName = attachment.original_name || 'Файл'

      // Определяем тип файла для предпросмотра
      if (mimeType.startsWith('image/')) {
        setPreviewFile({ url, name: fileName, type: 'image' })
      } else if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
        setPreviewFile({ url, name: fileName, type: 'pdf' })
      } else {
        // Для других типов файлов открываем в новом окне
        const newWindow = window.open(url, '_blank')
        if (!newWindow) {
          message.error('Не удалось открыть файл. Проверьте настройки блокировки всплывающих окон.')
        }
        setTimeout(() => URL.revokeObjectURL(url), 100)
      }
    } catch (error) {
      console.error('[InvoiceView.handlePreview] Error:', error)
      message.error('Ошибка при открытии файла')
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

  const handleDeleteAttachment = async (attachment: AttachmentData) => {
    try {
      console.log('[InvoiceView.handleDeleteAttachment] Deleting file:', attachment)

      // Сначала удаляем файл из Storage
      const { error: storageError } = await supabase.storage
        .from('attachments')
        .remove([attachment.storage_path])

      if (storageError) {
        console.error('[InvoiceView.handleDeleteAttachment] Storage deletion error:', storageError)
        // Продолжаем даже если не удалось удалить файл из Storage
      }

      // Удаляем связь из invoice_attachments
      const { error: linkError } = await supabase
        .from('invoice_attachments')
        .delete()
        .eq('invoice_id', invoice.id)
        .eq('attachment_id', attachment.id)

      if (linkError) {
        console.error('[InvoiceView.handleDeleteAttachment] Link deletion error:', linkError)
        throw linkError
      }

      // Удаляем запись из attachments
      const { error: attachmentError } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachment.id)

      if (attachmentError) {
        console.error('[InvoiceView.handleDeleteAttachment] Attachment deletion error:', attachmentError)
        throw attachmentError
      }

      message.success('Файл успешно удалён')

      // Обновляем список файлов
      await loadAttachments()

      console.log('[InvoiceView.handleDeleteAttachment] File deleted successfully')
    } catch (error) {
      console.error('[InvoiceView.handleDeleteAttachment] Error:', error)
      message.error('Ошибка удаления файла')
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Payment functions
  const loadPayments = async () => {
    try {
      setLoadingPayments(true)
      console.log('[InvoiceView.loadPayments] Loading payments for invoice:', invoice.id)

      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          payment_type:payment_types(id, name),
          payment_status:payment_statuses(id, code, name, color)
        `)
        .eq('invoice_id', invoice.id)
        .order('payment_date', { ascending: false })

      if (error) {
        console.error('[InvoiceView.loadPayments] Error:', error)
        messageApi.error('Ошибка загрузки платежей')
        return
      }

      console.log('[InvoiceView.loadPayments] Loaded payments:', data?.length || 0)
      setPayments(data || [])
    } catch (error) {
      console.error('[InvoiceView.loadPayments] Error:', error)
      messageApi.error('Ошибка загрузки платежей')
    } finally {
      setLoadingPayments(false)
    }
  }

  const loadPaymentReferences = async () => {
    try {
      // Загружаем типы платежей
      const { data: typesData, error: typesError } = await supabase
        .from('payment_types')
        .select('*')
        .order('name')

      if (typesError) {
        console.error('[InvoiceView.loadPaymentReferences] Types error:', typesError)
      } else {
        setPaymentTypes(typesData || [])
      }

      // Загружаем статусы платежей
      const { data: statusesData, error: statusesError } = await supabase
        .from('payment_statuses')
        .select('*')
        .order('sort_order')

      if (statusesError) {
        console.error('[InvoiceView.loadPaymentReferences] Statuses error:', statusesError)
      } else {
        setPaymentStatuses(statusesData || [])
      }
    } catch (error) {
      console.error('[InvoiceView.loadPaymentReferences] Error:', error)
    }
  }

  const handleCreatePayment = () => {
    console.log('[InvoiceView.handleCreatePayment] Opening payment modal for new payment')
    setEditingPayment(null)
    paymentForm.resetFields()
    setIsPaymentModalVisible(true)
  }

  const handleEditPayment = (payment: Payment) => {
    console.log('[InvoiceView.handleEditPayment] Opening payment modal for editing:', payment.id)
    setEditingPayment(payment)
    paymentForm.setFieldsValue({
      payment_date: dayjs(payment.payment_date),
      amount: payment.amount,
      payment_type_id: payment.payment_type_id,
      status_id: payment.status_id,
      description: payment.description
    })
    setIsPaymentModalVisible(true)
  }

  const handlePaymentSubmit = async (values: any, files: any[]) => {
    console.log('[InvoiceView.handlePaymentSubmit] Submitting payment:', { values, filesCount: files?.length, editMode: !!editingPayment })
    try {
      const paymentData = {
        payment_date: values.payment_date.format('YYYY-MM-DD'),
        amount: values.amount,
        payment_type_id: values.payment_type_id,
        status_id: values.status_id,
        description: values.description
      }

      let paymentId: string

      if (editingPayment) {
        // Обновляем существующий платёж
        const { data, error } = await supabase
          .from('payments')
          .update(paymentData)
          .eq('id', editingPayment.id)
          .select()
          .single()

        if (error) throw error
        console.log('[InvoiceView.handlePaymentSubmit] Payment updated:', data.id)
        paymentId = data.id

        // Обновляем сумму в таблице связи
        const { error: linkError } = await supabase
          .from('invoice_payments')
          .update({ allocated_amount: values.amount })
          .eq('payment_id', editingPayment.id)
          .eq('invoice_id', invoice.id)

        if (linkError) {
          console.error('[InvoiceView.handlePaymentSubmit] Link update error:', linkError)
        }
      } else {
        // Создаём новый платёж
        const { data, error } = await supabase
          .from('payments')
          .insert([{
            ...paymentData,
            invoice_id: invoice.id,
            created_by: user?.id
          }])
          .select()
          .single()

        if (error) throw error
        console.log('[InvoiceView.handlePaymentSubmit] Payment created:', data.id)
        paymentId = data.id

        // Создаём связь между счетом и платежом только для нового платежа
        const { error: linkError } = await supabase
          .from('invoice_payments')
          .insert([{
            invoice_id: invoice.id,
            payment_id: paymentId,
            allocated_amount: values.amount
          }])

        if (linkError) {
          console.error('[InvoiceView.handlePaymentSubmit] Link error:', linkError)
        }
      }

      // Загрузка файлов, если они есть (для новых и редактируемых платежей)
      if (files && files.length > 0 && paymentId) {
        console.log('[InvoiceView.handlePaymentSubmit] Uploading files for payment:', paymentId)

        for (const file of files) {
          try {
            // Генерируем уникальное имя файла
            const timestamp = Date.now()
            const fileName = `${timestamp}_${file.name}`
            const filePath = `payments/${paymentId}/${fileName}`

            console.log('[InvoiceView.handlePaymentSubmit] Uploading file:', filePath)

            // Загружаем файл в Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('attachments')
              .upload(filePath, file as any)

            if (uploadError) {
              console.error('[InvoiceView.handlePaymentSubmit] Upload error:', uploadError)
              messageApi.error(`Ошибка загрузки файла ${file.name}`)
              continue
            }

            // Создаём запись в таблице attachments
            const { data: attachmentData, error: attachmentError } = await supabase
              .from('attachments')
              .insert([{
                original_name: file.name,
                storage_path: filePath,
                size_bytes: file.size,
                mime_type: file.type || 'application/octet-stream',
                created_by: user?.id
              }])
              .select()
              .single()

            if (attachmentError) {
              console.error('[InvoiceView.handlePaymentSubmit] Attachment error:', attachmentError)
              continue
            }

            // Создаём связь между платежом и файлом
            const { error: linkError } = await supabase
              .from('payment_attachments')
              .insert([{
                payment_id: paymentId,
                attachment_id: attachmentData.id
              }])

            if (linkError) {
              console.error('[InvoiceView.handlePaymentSubmit] Link error:', linkError)
            }

            console.log('[InvoiceView.handlePaymentSubmit] File uploaded successfully:', file.name)
          } catch (fileError) {
            console.error('[InvoiceView.handlePaymentSubmit] File processing error:', fileError)
            messageApi.error(`Ошибка обработки файла ${file.name}`)
          }
        }
      }

      messageApi.success(editingPayment ? 'Платёж обновлён успешно' : 'Платёж добавлен успешно')
      setIsPaymentModalVisible(false)
      setEditingPayment(null)
      loadPayments()
    } catch (error: any) {
      console.error('[InvoiceView.handlePaymentSubmit] Error:', error)
      messageApi.error(error.message || 'Ошибка создания платежа')
    }
  }

  const handleDeletePayment = async (paymentId: string) => {
    console.log('[InvoiceView.handleDeletePayment] Deleting payment:', paymentId)

    modal.confirm({
      title: 'Удалить платёж?',
      content: 'Это действие нельзя отменить',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const { error } = await supabase
            .from('payments')
            .delete()
            .eq('id', paymentId)

          if (error) throw error

          messageApi.success('Платёж удалён')
          await loadPayments()
        } catch (error: any) {
          console.error('[InvoiceView.handleDeletePayment] Error:', error)
          messageApi.error(error.message || 'Ошибка удаления платежа')
        }
      }
    })
  }

  // Расчёт суммы всех платежей и остатка
  const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
  const remainingAmount = (invoice.amount_with_vat || 0) - totalPaid

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

  const paymentsColumns: ColumnsType<Payment> = [
    {
      title: '№',
      dataIndex: 'payment_number',
      key: 'payment_number',
      width: 80
    },
    {
      title: 'Дата',
      dataIndex: 'payment_date',
      key: 'payment_date',
      width: 100,
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU')
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      render: (amount: number) => `${formatAmount(amount)} ₽`
    },
    {
      title: 'Тип',
      dataIndex: 'payment_type',
      key: 'payment_type',
      render: (type: PaymentType | undefined) => type?.name || '-'
    },
    {
      title: 'Статус',
      key: 'status',
      width: 120,
      render: (_: any, record: Payment) => {
        const status = record.payment_status
        if (!status) return '-'
        return <Tag color={status.color || 'default'}>{status.name}</Tag>
      }
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
      render: (_: any, record: Payment) => (
        <Space size="small">
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEditPayment(record)}
            title="Редактировать"
          />
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleDeletePayment(record.id)}
            title="Удалить"
          />
        </Space>
      )
    }
  ]

  const paymentsTab = (
    <div>
      <div style={{
        marginBottom: 16,
        padding: '16px',
        backgroundColor: '#fafafa',
        borderRadius: '4px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 500 }}>
            Сумма счёта: <span style={{ color: '#1890ff' }}>{formatAmount(invoice.amount_with_vat || 0)} ₽</span>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 500, marginTop: '8px' }}>
            Оплачено: <span style={{ color: '#52c41a' }}>{formatAmount(totalPaid)} ₽</span>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 500, marginTop: '8px' }}>
            Остаток: <span style={{ color: remainingAmount > 0 ? '#ff4d4f' : '#52c41a' }}>
              {formatAmount(Math.abs(remainingAmount))} ₽
            </span>
            {remainingAmount < 0 && ' (переплата)'}
          </div>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreatePayment}
        >
          Добавить платёж
        </Button>
      </div>

      {loadingPayments ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Загрузка платежей...</div>
      ) : payments.length > 0 ? (
        <Table
          columns={paymentsColumns}
          dataSource={payments}
          rowKey="id"
          pagination={false}
        />
      ) : (
        <Empty description="Нет платежей" />
      )}
    </div>
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
              width: 180,
              render: (_, record) => (
                <Space>
                  <Button
                    icon={<EyeOutlined />}
                    onClick={() => handlePreview(record)}
                    size="small"
                    title="Просмотр"
                  />
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => handleDownload(record)}
                    size="small"
                    title="Скачать"
                  />
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={() => {
                      Modal.confirm({
                        title: 'Удалить файл?',
                        content: `Вы уверены, что хотите удалить файл "${record.original_name}"?`,
                        okText: 'Удалить',
                        cancelText: 'Отмена',
                        okButtonProps: { danger: true },
                        onOk: () => handleDeleteAttachment(record)
                      })
                    }}
                    size="small"
                    danger
                    title="Удалить"
                  />
                </Space>
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
          activeKey={activeTab}
          onChange={(key) => {
            // Обновляем URL с новой вкладкой
            setSearchParams({ tab: key })
          }}
          items={[
            {
              key: 'main',
              label: 'Основная информация',
              children: mainInfoTab
            },
            {
              key: 'payments',
              label: (
                <Space>
                  <DollarOutlined />
                  Платежи ({payments.length})
                </Space>
              ),
              children: paymentsTab
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

    {/* Модальное окно для предпросмотра файлов */}
    <Modal
      open={!!previewFile}
      title={previewFile?.name}
      footer={null}
      onCancel={() => {
        // Очищаем URL объекта при закрытии для освобождения памяти
        if (previewFile?.url.startsWith('blob:')) {
          URL.revokeObjectURL(previewFile.url)
        }
        setPreviewFile(null)
      }}
      width={900}
      centered
      styles={{ body: { padding: 0 } }}
    >
      {previewFile && (
        <>
          {previewFile.type === 'image' ? (
            <img
              src={previewFile.url}
              alt={previewFile.name}
              style={{
                width: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                padding: '20px'
              }}
            />
          ) : previewFile.type === 'pdf' ? (
            <iframe
              src={previewFile.url}
              title={previewFile.name}
              style={{
                width: '100%',
                height: '70vh',
                border: 'none'
              }}
            />
          ) : null}
        </>
      )}
    </Modal>

    {/* Модальное окно для добавления/редактирования платежа */}
    <PaymentFormModal
      isVisible={isPaymentModalVisible}
      onClose={() => {
        setIsPaymentModalVisible(false)
        setEditingPayment(null)
      }}
      onSubmit={handlePaymentSubmit}
      form={paymentForm}
      paymentTypes={paymentTypes}
      paymentStatuses={paymentStatuses}
      invoiceAmount={invoice.amount_with_vat || 0}
      remainingAmount={remainingAmount}
      editMode={!!editingPayment}
    />
    </>
  )
}