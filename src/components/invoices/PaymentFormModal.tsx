import { Modal, Form, Input, InputNumber, Select, DatePicker, Space, Button, Upload, App } from 'antd'
import { useEffect, useState } from 'react'
import { UploadOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import type { UploadFile, UploadProps } from 'antd/es/upload/interface'
import dayjs from 'dayjs'
import type { PaymentType, PaymentStatus } from '../../lib/supabase'

interface PaymentFormModalProps {
  isVisible: boolean
  onClose: () => void
  onSubmit: (values: any, files: UploadFile[]) => void
  form: any
  paymentTypes: PaymentType[]
  paymentStatuses: PaymentStatus[]
  invoiceAmount: number
  remainingAmount: number
  editMode?: boolean
  existingFiles?: UploadFile[]
}

export const PaymentFormModal: React.FC<PaymentFormModalProps> = ({
  isVisible,
  onClose,
  onSubmit,
  form,
  paymentTypes,
  paymentStatuses,
  invoiceAmount,
  remainingAmount,
  editMode = false,
  existingFiles = []
}) => {
  const { message: messageApi } = App.useApp()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null)

  useEffect(() => {
    if (isVisible && !editMode) {
      // Устанавливаем текущую дату и оставшуюся сумму по умолчанию только для новых платежей
      const defaultValues: any = {
        payment_date: dayjs(),
        amount: remainingAmount > 0 ? remainingAmount : 0
      }

      // Устанавливаем тип платежа по умолчанию - Банковский перевод
      if (paymentTypes.length > 0) {
        // Ищем тип с кодом 'bank_transfer' или берём первый тип
        const bankTransferType = paymentTypes.find(t => t.code === 'bank_transfer')
        if (bankTransferType) {
          defaultValues.payment_type_id = bankTransferType.id
        }
      }

      // Устанавливаем статус по умолчанию, если есть статусы
      if (paymentStatuses.length > 0) {
        // Ищем статус с кодом 'pending' или берём первый статус
        const pendingStatus = paymentStatuses.find(s => s.code === 'pending')
        const defaultStatus = pendingStatus || paymentStatuses[0]
        defaultValues.status_id = defaultStatus.id
      }

      form.setFieldsValue(defaultValues)
    }

    // Устанавливаем файлы при открытии
    if (isVisible) {
      if (editMode && existingFiles.length > 0) {
        // В режиме редактирования устанавливаем существующие файлы
        setFileList(existingFiles)
      } else {
        // В режиме создания очищаем список
        setFileList([])
      }
      setPreviewFile(null)
    }
  }, [isVisible, remainingAmount, paymentTypes, paymentStatuses, form, editMode, existingFiles])

  const handleSubmit = (values: any) => {
    console.log('[PaymentFormModal.handleSubmit] Submitting with files:', fileList.length)
    onSubmit(values, fileList)
  }

  const handlePreview = async (file: UploadFile) => {
    // Проверяем, есть ли у файла originFileObj (новый файл) или url (существующий файл)
    if (!file.originFileObj && !file.url) {
      messageApi.error('Файл недоступен для просмотра')
      return
    }

    // Для изображений создаём URL для предпросмотра
    if (file.type?.startsWith('image/')) {
      let url = ''
      if (file.url) {
        // Для существующих файлов используем URL
        url = file.url
      } else if (file.originFileObj) {
        // Для новых файлов создаём blob URL
        url = URL.createObjectURL(file.originFileObj as Blob)
      }

      if (url) {
        setPreviewFile({
          url,
          name: file.name,
          type: file.type || 'image'
        })
      }
    } else if (file.type === 'application/pdf') {
      let url = ''
      if (file.url) {
        // Для существующих файлов открываем URL
        window.open(file.url, '_blank')
      } else if (file.originFileObj) {
        // Для новых файлов создаём blob URL
        url = URL.createObjectURL(file.originFileObj as Blob)
        window.open(url, '_blank')
      }
    } else {
      messageApi.info('Предпросмотр доступен только для изображений и PDF файлов')
    }
  }

  const uploadProps: UploadProps = {
    multiple: true,
    fileList,
    showUploadList: {
      showPreviewIcon: true,
      showRemoveIcon: true,
      showDownloadIcon: false,
      previewIcon: <EyeOutlined />,
      removeIcon: <DeleteOutlined />,
    },
    onPreview: handlePreview,
    beforeUpload: (file) => {
      console.log('[PaymentFormModal.beforeUpload] Adding file:', file.name)
      // Проверка размера файла (10MB)
      const isLt10M = file.size / 1024 / 1024 < 10
      if (!isLt10M) {
        messageApi.error(`${file.name} не должен превышать 10 МБ`)
        return Upload.LIST_IGNORE
      }

      // Создаем объект UploadFile с правильной структурой
      const uploadFile: UploadFile = {
        uid: file.uid || `-${Date.now()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        originFileObj: file as any,
        status: 'done',
      }

      // Добавляем файл в список
      setFileList((prev) => [...prev, uploadFile])
      return false // Предотвращаем автоматическую загрузку
    },
    onRemove: (file: UploadFile) => {
      console.log('[PaymentFormModal.onRemove] Removing file:', file.name)
      setFileList((prev) => prev.filter(f => f.uid !== file.uid))
    },
    // Исключаем показ превью в тултипе
    previewFile: async () => {
      return ''
    }
  }

  return (
    <Modal
      title={editMode ? "Редактировать платёж" : "Добавить платёж"}
      open={isVisible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <div style={{
          marginBottom: 16,
          padding: '12px',
          backgroundColor: '#f0f0f0',
          borderRadius: '4px'
        }}>
          <div>Сумма счёта: <strong>{invoiceAmount.toLocaleString('ru-RU')} ₽</strong></div>
          <div>Остаток к оплате: <strong style={{ color: remainingAmount > 0 ? '#ff4d4f' : '#52c41a' }}>
            {remainingAmount.toLocaleString('ru-RU')} ₽
          </strong></div>
        </div>

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
              if (!value) return 0
              return parseFloat(value.replace(/\s/g, '').replace(',', '.')) || 0
            }}
            addonAfter="₽"
          />
        </Form.Item>

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
          name="status_id"
          label="Статус платежа"
          rules={[{ required: true, message: 'Выберите статус' }]}
        >
          <Select
            placeholder="Выберите статус"
            options={paymentStatuses.map(status => ({
              value: status.id,
              label: status.name
            }))}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Описание"
        >
          <Input.TextArea
            rows={3}
            placeholder="Дополнительная информация о платеже"
          />
        </Form.Item>

        <Form.Item label="Прикреплённые файлы">
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />}>Выбрать файлы</Button>
          </Upload>
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={onClose}>
              Отмена
            </Button>
            <Button type="primary" htmlType="submit">
              {editMode ? 'Сохранить изменения' : 'Добавить платёж'}
            </Button>
          </Space>
        </Form.Item>
      </Form>

      {/* Модальное окно предпросмотра изображения */}
      <Modal
        open={!!previewFile && previewFile.type?.startsWith('image')}
        title={previewFile?.name}
        footer={null}
        onCancel={() => setPreviewFile(null)}
        width={800}
      >
        {previewFile && (
          <img
            alt={previewFile.name}
            style={{ width: '100%' }}
            src={previewFile.url}
          />
        )}
      </Modal>
    </Modal>
  )
}