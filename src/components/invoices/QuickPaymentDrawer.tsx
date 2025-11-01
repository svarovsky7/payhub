import { Drawer, Form, Button, Space, InputNumber, DatePicker, Select, Input, Divider, Typography, Upload, Modal, Image, message, Checkbox } from 'antd'
import { useState, useEffect } from 'react'
import { DollarOutlined, CheckOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Invoice, PaymentType, PaymentStatus } from '../../lib/supabase'
import type { UploadFile } from 'antd/es/upload/interface'
import { formatAmount } from '../../utils/invoiceHelpers'

const { Title, Text } = Typography

interface PaymentByStatus {
  statusName: string
  amount: number
  color?: string
}

interface QuickPaymentDrawerProps {
  open: boolean
  onClose: () => void
  invoice: Invoice | null
  onSubmit: (invoiceId: string, values: any, files: UploadFile[]) => Promise<void>
  paymentTypes: PaymentType[]
  paymentStatuses: PaymentStatus[]
  totalPaid: number
  remainingAmount: number
  paymentsByStatus: Record<number, PaymentByStatus>
}

export const QuickPaymentDrawer: React.FC<QuickPaymentDrawerProps> = ({
  open,
  onClose,
  invoice,
  onSubmit,
  paymentTypes,
  paymentStatuses,
  // totalPaid, // Not used in component
  remainingAmount,
  paymentsByStatus
}) => {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [fileDescriptions, setFileDescriptions] = useState<{ [uid: string]: string }>({})
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewTitle, setPreviewTitle] = useState('')
  const [previewType, setPreviewType] = useState<'image' | 'document'>('document')

  useEffect(() => {
    if (open && invoice) {

      // Устанавливаем значения по умолчанию
      const defaultValues: any = {
        payment_date: dayjs(),
        amount: remainingAmount > 0 ? remainingAmount : 0
      }

      // Устанавливаем тип платежа по умолчанию - банковский перевод
      if (paymentTypes.length > 0) {
        const bankTransferType = paymentTypes.find(t => t.code === 'bank_transfer')
        if (bankTransferType) {
          defaultValues.payment_type_id = bankTransferType.id
        } else {
          defaultValues.payment_type_id = paymentTypes[0].id
        }
      }

      form.setFieldsValue(defaultValues)
    } else if (!open) {
      // Очищаем форму и файлы при закрытии
      form.resetFields()
      setFileList([])
      setFileDescriptions({})
    }
  }, [open, invoice, form, paymentTypes, paymentStatuses, remainingAmount])

  const handleSubmit = async (values: any) => {
    if (!invoice) return

    console.log('[QuickPaymentDrawer.handleSubmit] Form values:', values)
    setSubmitting(true)

    try {
      // Добавляем описания к файлам
      const filesWithDescriptions = fileList.map(file => ({
        ...file,
        description: fileDescriptions[file.uid] || ''
      }))

      await onSubmit(invoice.id, values, filesWithDescriptions)
      form.resetFields()
      setFileList([])
      setFileDescriptions({})
      onClose()
    } catch (error) {
      console.error('[QuickPaymentDrawer.handleSubmit] Error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePayFull = () => {
    if (remainingAmount > 0) {
      form.setFieldsValue({ amount: remainingAmount })
    }
  }

  const handlePreview = async (file: UploadFile) => {

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase()
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(fileExt || '')

      if (file.originFileObj) {
        // For newly uploaded files (not yet saved)
        const url = URL.createObjectURL(file.originFileObj as Blob)
        setPreviewUrl(url)
        setPreviewTitle(file.name)
        setPreviewType(isImage ? 'image' : 'document')
        setPreviewVisible(true)
      }
    } catch (error) {
      console.error('[QuickPaymentDrawer] Preview error:', error)
      message.error('Ошибка при просмотре файла')
    }
  }

  const handleClosePreview = () => {
    setPreviewVisible(false)
    // Clean up object URL if it's a blob URL
    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl('')
  }

  const uploadProps = {
    beforeUpload: (file: File) => {
      const uploadFile: UploadFile = {
        uid: (file as any).uid || `rc-upload-${Date.now()}-${Math.random()}`,
        name: file.name,
        status: 'done',
        size: file.size,
        type: file.type,
        originFileObj: file as any
      }
      setFileList(prev => [...prev, uploadFile])
      return false // Prevent auto upload
    },
    onRemove: (file: UploadFile) => {
      setFileList(prev => prev.filter(f => f.uid !== file.uid))
      setFileDescriptions(prev => {
        const newDesc = { ...prev }
        delete newDesc[file.uid]
        return newDesc
      })
    },
    onPreview: handlePreview,
    fileList,
    multiple: true,
    showUploadList: {
      showPreviewIcon: true,
      showRemoveIcon: true
    }
  }

  if (!invoice) return null

  return (
    <>
    <Drawer
      title="Быстрый платёж"
      placement="right"
      onClose={onClose}
      open={open}
      width={500}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
          Счёт {invoice.invoice_number}
        </Title>
        <Text type="secondary">
          {invoice.payer?.name} → {invoice.supplier?.name}
        </Text>
      </div>

      <div style={{
        marginBottom: 16,
        padding: 12,
        background: '#fafafa',
        borderRadius: 6,
        border: '1px solid #d9d9d9'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text>Сумма счёта:</Text>
          <Text strong>{formatAmount(invoice.amount_with_vat || 0)} ₽</Text>
        </div>

        {invoice.delivery_cost && invoice.delivery_cost > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, paddingLeft: 12 }}>
            <Text style={{ fontSize: 13 }}>Доставка:</Text>
            <Text style={{ fontSize: 13 }}>{formatAmount(invoice.delivery_cost)} ₽</Text>
          </div>
        )}

        {invoice.delivery_cost && invoice.delivery_cost > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, borderTop: '1px solid #d9d9d9', paddingTop: 8 }}>
            <Text strong>Итого с доставкой:</Text>
            <Text strong>{formatAmount((invoice.amount_with_vat || 0) + (invoice.delivery_cost || 0))} ₽</Text>
          </div>
        )}

        {/* Payments by status */}
        {Object.keys(paymentsByStatus).length > 0 ? (
          <>
            {Object.entries(paymentsByStatus).map(([statusId, statusData]) => (
              <div key={statusId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, paddingLeft: 12 }}>
                <Text style={{ fontSize: 13 }}>
                  {statusData.statusName}:
                </Text>
                <Text style={{ fontSize: 13, color: statusData.color || '#52c41a' }}>
                  {formatAmount(statusData.amount)} ₽
                </Text>
              </div>
            ))}
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, paddingLeft: 12 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>Платежей нет</Text>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <Text>Остаток:</Text>
          <Text strong style={{ color: remainingAmount > 0 ? '#ff4d4f' : '#52c41a' }}>
            {formatAmount(Math.abs(remainingAmount))} ₽
            {remainingAmount < 0 && ' (переплата)'}
          </Text>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="payment_date"
          label="Дата платежа"
          rules={[{ required: true, message: 'Укажите дату платежа' }]}
        >
          <DatePicker
            style={{ width: '100%' }}
            format="DD.MM.YYYY"
          />
        </Form.Item>

        <Form.Item
          name="amount"
          label="Сумма платежа"
          rules={[
            { required: true, message: 'Укажите сумму платежа' },
            { type: 'number', min: 0.01, message: 'Сумма должна быть больше 0' }
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            min={0.01}
            max={999999999.99}
            precision={2}
            decimalSeparator=","
            formatter={(value) => {
              if (!value) return ''
              return `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ').replace('.', ',')
            }}
            parser={(value) => {
              if (!value) return null as any
              const parsed = parseFloat(value.replace(/\s/g, '').replace(',', '.'))
              return isNaN(parsed) ? null as any : parsed
            }}
            addonAfter="₽"
          />
        </Form.Item>

        {remainingAmount > 0 && (
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <Button
              type="dashed"
              size="small"
              onClick={handlePayFull}
              icon={<CheckOutlined />}
            >
              Оплатить полностью ({formatAmount(remainingAmount)} ₽)
            </Button>
          </div>
        )}

        <Form.Item
          name="payment_type_id"
          label="Тип платежа"
          rules={[{ required: true, message: 'Выберите тип платежа' }]}
        >
          <Select
            placeholder="Выберите тип платежа"
            options={paymentTypes.map(type => ({
              value: type.id,
              label: type.name
            }))}
          />
        </Form.Item>


        <Form.Item
          name="description"
          label="Описание (опционально)"
        >
          <Input.TextArea
            rows={2}
            placeholder="Краткое описание платежа"
          />
        </Form.Item>

        <Form.Item name="requires_payment_order" valuePropName="checked" initialValue={false}>
          <Checkbox style={{ marginRight: 8 }}>Требуется платёжное поручение</Checkbox>
        </Form.Item>

        <Form.Item label="Прикрепить файлы">
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />}>Добавить файлы</Button>
          </Upload>
          {fileList.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Загружено файлов: {fileList.length}
              </Text>
            </div>
          )}
        </Form.Item>

        {fileList.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {fileList.map(file => (
              <div
                key={file.uid}
                style={{
                  marginBottom: 8,
                  padding: 8,
                  background: '#fafafa',
                  borderRadius: 4,
                  border: '1px solid #d9d9d9'
                }}
              >
                <div style={{ marginBottom: 4 }}>
                  <Text strong style={{ fontSize: 12 }}>{file.name}</Text>
                </div>
                <Input
                  placeholder="Описание файла (опционально)"
                  value={fileDescriptions[file.uid] || ''}
                  onChange={(e) => setFileDescriptions(prev => ({
                    ...prev,
                    [file.uid]: e.target.value
                  }))}
                  size="small"
                />
              </div>
            ))}
          </div>
        )}

        <Divider />

        <Form.Item style={{ marginBottom: 0 }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Button onClick={onClose}>
              Отмена
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              icon={<DollarOutlined />}
            >
              Добавить платёж
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Drawer>

    {/* File Preview Modal */}
    <Modal
      open={previewVisible}
      title={previewTitle}
      footer={[
        <Button key="close" onClick={handleClosePreview}>
          Закрыть
        </Button>,
        <Button
          key="download"
          type="primary"
          icon={<DownloadOutlined />}
          onClick={() => {
            const link = document.createElement('a')
            link.href = previewUrl
            link.download = previewTitle
            link.target = '_blank'
            link.click()
          }}
        >
          Скачать
        </Button>
      ]}
      onCancel={handleClosePreview}
      width={previewType === 'image' ? 800 : 900}
      styles={{
        body: {
          padding: previewType === 'document' ? 0 : 24,
          height: previewType === 'document' ? '70vh' : 'auto'
        }
      }}
    >
      {previewType === 'image' ? (
        <Image
          alt={previewTitle}
          style={{ width: '100%' }}
          src={previewUrl}
        />
      ) : (
        <iframe
          src={previewUrl}
          style={{
            width: '100%',
            height: '70vh',
            border: 'none'
          }}
          title={previewTitle}
        />
      )}
    </Modal>
    </>
  )
}