import { useEffect, useState } from 'react'
import { Modal, Form, DatePicker, InputNumber, Select, Input, Space, Button, Upload, message, Image } from 'antd'
import { UploadOutlined, DeleteOutlined, FileOutlined, EyeOutlined, FilePdfOutlined, FileImageOutlined, FileTextOutlined, DownloadOutlined } from '@ant-design/icons'
import type { Payment, PaymentType, PaymentStatus } from '../../lib/supabase'
import type { UploadFile } from 'antd/es/upload/interface'
import { supabase } from '../../lib/supabase'
import dayjs from 'dayjs'
import { formatAmount, parseAmount } from '../../utils/invoiceHelpers'

interface PaymentEditModalProps {
  visible: boolean
  payment: Payment | null
  paymentTypes: PaymentType[]
  paymentStatuses: PaymentStatus[]
  onCancel: () => void
  onSave: (paymentId: string, values: any, files: UploadFile[]) => void
}

export const PaymentEditModal: React.FC<PaymentEditModalProps> = ({
  visible,
  payment,
  paymentTypes,
  paymentStatuses,
  onCancel,
  onSave
}) => {
  const [form] = Form.useForm()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [existingFiles, setExistingFiles] = useState<UploadFile[]>([])
  const [loading, setLoading] = useState(false)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewTitle, setPreviewTitle] = useState('')
  const [previewType, setPreviewType] = useState<'image' | 'document'>('document')

  // Load existing files when payment changes
  useEffect(() => {
    if (payment && visible) {
      loadExistingFiles(payment.id)
    } else {
      setFileList([])
      setExistingFiles([])
    }
  }, [payment, visible])

  useEffect(() => {
    if (payment && visible) {
      console.log('[PaymentEditModal] Setting form values for payment:', payment.id)
      form.setFieldsValue({
        payment_date: payment.payment_date ? dayjs(payment.payment_date) : dayjs(),
        amount: payment.amount,
        payment_type_id: payment.payment_type_id,
        description: payment.description
      })
    }
  }, [payment, visible, form])

  const loadExistingFiles = async (paymentId: string) => {
    try {
      console.log('[PaymentEditModal] Loading existing files for payment:', paymentId)

      const { data: attachments, error } = await supabase
        .from('payment_attachments')
        .select(`
          attachment_id,
          attachments (
            id,
            original_name,
            storage_path,
            size_bytes,
            created_at
          )
        `)
        .eq('payment_id', paymentId)

      if (error) throw error

      if (attachments && attachments.length > 0) {
        const files = attachments.map((item: any) => ({
          uid: item.attachments.id,
          name: item.attachments.original_name,
          status: 'done',
          size: item.attachments.size_bytes,
          existingAttachmentId: item.attachments.id,
          storagePath: item.attachments.storage_path,
          url: ''  // We'll use signed URLs for actual preview/download
        }))

        console.log('[PaymentEditModal] Loaded existing files:', files.length)
        setExistingFiles(files as UploadFile[])
      }
    } catch (error) {
      console.error('[PaymentEditModal] Error loading files:', error)
      message.error('Ошибка загрузки файлов')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      console.log('[PaymentEditModal] Submitting payment update:', values)
      console.log('[PaymentEditModal] Files to upload:', fileList.length)

      if (!payment) return

      const paymentData = {
        payment_date: values.payment_date.format('YYYY-MM-DD'),
        amount: parseAmount(values.amount),
        payment_type_id: values.payment_type_id,
        description: values.description
      }

      // Combine existing files and new files
      const allFiles = [...existingFiles, ...fileList]

      onSave(payment.id, paymentData, allFiles)
      form.resetFields()
      setFileList([])
      setExistingFiles([])
    } catch (error) {
      console.error('[PaymentEditModal] Validation error:', error)
    }
  }

  const handleRemoveExistingFile = async (file: UploadFile) => {
    console.log('[PaymentEditModal] Removing existing file:', file.name)

    // Remove from existing files list immediately for UI responsiveness
    setExistingFiles(prev => prev.filter(f => f.uid !== file.uid))

    // Note: Actual deletion from database will happen when saving
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext || '')) {
      return <FileImageOutlined />
    } else if (ext === 'pdf') {
      return <FilePdfOutlined />
    } else if (['doc', 'docx', 'txt', 'rtf'].includes(ext || '')) {
      return <FileTextOutlined />
    }
    return <FileOutlined />
  }

  const handlePreview = async (file: UploadFile) => {
    console.log('[PaymentEditModal] Previewing file:', file.name)

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase()
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(fileExt || '')

      // For existing files, generate signed URL
      if ((file as any).storagePath) {
        const { data: signedUrlData, error } = await supabase.storage
          .from('attachments')
          .createSignedUrl((file as any).storagePath, 300) // 5 minutes expiry for preview

        if (error) throw error

        if (signedUrlData?.signedUrl) {
          setPreviewUrl(signedUrlData.signedUrl)
          setPreviewTitle(file.name)
          setPreviewType(isImage ? 'image' : 'document')
          setPreviewVisible(true)
        }
      } else if (file.originFileObj) {
        // For newly uploaded files (not yet saved)
        const url = URL.createObjectURL(file.originFileObj as Blob)
        setPreviewUrl(url)
        setPreviewTitle(file.name)
        setPreviewType(isImage ? 'image' : 'document')
        setPreviewVisible(true)
      }
    } catch (error) {
      console.error('[PaymentEditModal] Preview error:', error)
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
    beforeUpload: (file: any) => {
      console.log('[PaymentEditModal] Adding file to list:', file.name)
      setFileList(prev => [...prev, file])
      return false // Prevent auto upload
    },
    onRemove: (file: UploadFile) => {
      console.log('[PaymentEditModal] Removing file from list:', file.name)
      setFileList(prev => prev.filter(f => f.uid !== file.uid))
    },
    onPreview: handlePreview,
    fileList,
    multiple: true,
    showUploadList: {
      showPreviewIcon: true,
      showRemoveIcon: true
    }
  }

  return (
    <>
      <Modal
        title="Редактировать платеж"
        open={visible}
        onCancel={() => {
          form.resetFields()
          onCancel()
        }}
        width={600}
        footer={[
          <Button key="cancel" onClick={() => {
            form.resetFields()
            onCancel()
          }}>
            Отмена
          </Button>,
          <Button key="save" type="primary" onClick={handleSubmit}>
            Сохранить
          </Button>
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            label="Дата платежа"
            name="payment_date"
            rules={[{ required: true, message: 'Укажите дату платежа' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD.MM.YYYY"
              placeholder="Выберите дату"
            />
          </Form.Item>

          <Form.Item
            label="Сумма платежа"
            name="amount"
            rules={[{ required: true, message: 'Укажите сумму платежа' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="0,00"
              formatter={(value) => formatAmount(value)}
              parser={(value) => parseAmount(value) as any}
              min={0}
              step={1000}
            />
          </Form.Item>

          <Form.Item
            label="Тип платежа"
            name="payment_type_id"
            rules={[{ required: true, message: 'Выберите тип' }]}
          >
            <Select
              placeholder="Выберите тип платежа"
              options={paymentTypes.map(type => ({
                label: type.name,
                value: type.id
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Описание"
            name="description"
          >
            <Input.TextArea
              rows={3}
              placeholder="Введите описание платежа"
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item label="Прикрепленные файлы">
            {/* Display existing files */}
            {existingFiles.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: 8 }}>
                  Загруженные файлы:
                </div>
                {existingFiles.map(file => (
                  <div key={file.uid} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '4px 8px',
                    marginBottom: 4,
                    backgroundColor: '#f5f5f5',
                    borderRadius: 4
                  }}>
                    <Space size="small">
                      {getFileIcon(file.name)}
                      <span style={{ fontSize: '13px' }}>{file.name}</span>
                      <span style={{ fontSize: '12px', color: '#888' }}>
                        {file.size ? `(${(file.size / 1024).toFixed(1)} KB)` : ''}
                      </span>
                    </Space>
                    <Space size="small">
                      <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handlePreview(file)}
                        title="Просмотр"
                      />
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveExistingFile(file)}
                        title="Удалить"
                      />
                    </Space>
                  </div>
                ))}
              </div>
            )}

            {/* Upload new files */}
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />}>Добавить файлы</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

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