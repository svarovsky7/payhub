import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Card,
  Form,
  Space,
  Button,
  Divider,
  Typography,
  FloatButton,
  Modal,
  message
} from 'antd'
import { SaveOutlined, CloseOutlined, ArrowLeftOutlined, DollarOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import type { Invoice, Contractor, Project, InvoiceType, InvoiceStatus, Payment, PaymentType, PaymentStatus } from '../../lib/supabase'
import { calculateDeliveryDate } from '../../utils/invoiceHelpers'
import { PaymentFormModal } from './PaymentFormModal'
import { InvoiceMainTab } from './InvoiceMainTab'
import { InvoicePaymentsTab } from './InvoicePaymentsTab'
import { InvoiceAttachmentsTab } from './InvoiceAttachmentsTab'
import {
  formatFileSize,
  handlePreviewFile,
  handleDownloadFile,
  handleDeleteAttachmentFile,
  loadPaymentFiles,
  calculatePaymentTotals
} from './InvoiceHelpers'
import { submitPayment, deletePayment } from './PaymentOperations'
import {
  loadInvoiceAttachments,
  loadPaymentsList,
  loadPaymentReferences,
  type AttachmentData
} from './AttachmentOperations'
import { useAuth } from '../../contexts/AuthContext'
import { App } from 'antd'

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
  const [editingPaymentFiles, setEditingPaymentFiles] = useState<any[]>([])

  // Теперь всегда показываем только вкладку с файлами
  const activeTab = 'attachments'

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
    loadReferences()
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
      const attachments = await loadInvoiceAttachments(invoice.id)
      setAttachments(attachments)
    } catch (error) {
      console.error('[InvoiceView.loadAttachments] Error:', error)
      message.error('Ошибка загрузки файлов')
    } finally {
      setLoadingAttachments(false)
    }
  }

  const handlePreview = async (attachment: AttachmentData) => {
    await handlePreviewFile(attachment, setPreviewFile, messageApi)
  }

  const handleDownload = async (attachment: AttachmentData) => {
    await handleDownloadFile(attachment, messageApi)
  }

  const handleDeleteAttachment = async (attachment: AttachmentData) => {
    await handleDeleteAttachmentFile(attachment, invoice.id, loadAttachments, messageApi)
  }


  // Payment functions
  const loadPayments = async () => {
    try {
      setLoadingPayments(true)
      const data = await loadPaymentsList(invoice.id)
      setPayments(data)
    } catch (error) {
      console.error('[InvoiceView.loadPayments] Error:', error)
      messageApi.error('Ошибка загрузки платежей')
    } finally {
      setLoadingPayments(false)
    }
  }

  const loadReferences = async () => {
    try {
      const { types, statuses } = await loadPaymentReferences()
      setPaymentTypes(types)
      setPaymentStatuses(statuses)
    } catch (error) {
      console.error('[InvoiceView.loadReferences] Error:', error)
    }
  }

  const handleCreatePayment = () => {
    console.log('[InvoiceView.handleCreatePayment] Opening payment modal for new payment')
    setEditingPayment(null)
    setEditingPaymentFiles([])
    paymentForm.resetFields()
    setIsPaymentModalVisible(true)
  }

  const handleEditPayment = async (payment: Payment) => {
    console.log('[InvoiceView.handleEditPayment] Opening payment modal for editing:', payment.id)
    setEditingPayment(payment)
    paymentForm.setFieldsValue({
      payment_date: dayjs(payment.payment_date),
      amount: payment.amount,
      payment_type_id: payment.payment_type_id,
      status_id: payment.status_id,
      description: payment.description
    })

    // Загружаем существующие файлы платежа
    const existingFiles = await loadPaymentFiles(payment.id)
    setEditingPaymentFiles(existingFiles)
    setIsPaymentModalVisible(true)
  }

  const handlePaymentSubmit = async (values: any, files: any[]) => {
    console.log('[InvoiceView.handlePaymentSubmit] Submitting payment:', { values, filesCount: files?.length, editMode: !!editingPayment })
    try {
      await submitPayment({
        values,
        files,
        editingPayment,
        invoiceId: invoice.id,
        userId: user?.id,
        messageApi
      })

      messageApi.success(editingPayment ? 'Платёж обновлён успешно' : 'Платёж добавлен успешно')
      setIsPaymentModalVisible(false)
      setEditingPayment(null)
      // Обновляем платежи и файлы после добавления/редактирования платежа
      await loadPayments()
      await loadAttachments()
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
          await deletePayment(paymentId)
          messageApi.success('Платёж удалён')
          await loadPayments()
          await loadAttachments()
        } catch (error: any) {
          console.error('[InvoiceView.handleDeletePayment] Error:', error)
          messageApi.error(error.message || 'Ошибка удаления платежа')
        }
      }
    })
  }

  // Расчёт суммы всех платежей и остатка
  const totalPaid = calculatePaymentTotals(payments)
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
    <InvoiceMainTab
      form={form}
      isEditing={isEditing}
      handleFormChange={handleFormChange}
      invoiceStatuses={invoiceStatuses}
      invoiceTypes={invoiceTypes}
      payers={payers}
      suppliers={suppliers}
      projects={projects}
      amountWithVat={amountWithVat}
      setAmountWithVat={setAmountWithVat}
      vatRate={vatRate}
      setVatRate={setVatRate}
      vatAmount={vatAmount}
      amountWithoutVat={amountWithoutVat}
      deliveryDays={deliveryDays}
      setDeliveryDays={setDeliveryDays}
      deliveryDaysType={deliveryDaysType}
      setDeliveryDaysType={setDeliveryDaysType}
      setInvoiceDate={setInvoiceDate}
      preliminaryDeliveryDate={preliminaryDeliveryDate}
    />
  )

  const paymentsTab = (
    <InvoicePaymentsTab
      payments={payments}
      loadingPayments={loadingPayments}
      invoiceAmount={invoice.amount_with_vat || 0}
      totalPaid={totalPaid}
      remainingAmount={remainingAmount}
      onCreatePayment={handleCreatePayment}
      onEditPayment={handleEditPayment}
      onDeletePayment={handleDeletePayment}
    />
  )

  const attachmentsTab = (
    <InvoiceAttachmentsTab
      attachments={attachments}
      loadingAttachments={loadingAttachments}
      onPreview={handlePreview}
      onDownload={handleDownload}
      onDelete={handleDeleteAttachment}
      formatFileSize={formatFileSize}
    />
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
              Файлы счёта № {invoice.invoice_number} ({attachments.length})
            </Title>
          </Space>
        }
      >
        {/* Показываем только содержимое вкладки с файлами без самих вкладок */}
        {attachmentsTab}
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
        setEditingPaymentFiles([])
      }}
      onSubmit={handlePaymentSubmit}
      form={paymentForm}
      paymentTypes={paymentTypes}
      paymentStatuses={paymentStatuses}
      invoiceAmount={invoice.amount_with_vat || 0}
      remainingAmount={remainingAmount}
      editMode={!!editingPayment}
      existingFiles={editingPaymentFiles}
    />
    </>
  )
}