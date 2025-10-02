import { Modal, Button, Space, Typography, Upload, Input, message } from 'antd'
import { InfoCircleOutlined, UploadOutlined } from '@ant-design/icons'
import type { PaymentApproval } from '../../services/approvalOperations'
import type { UploadFile } from 'antd/es/upload/interface'
import { useState } from 'react'
import { processPaymentFiles } from '../../services/paymentOperations'
import { useAuth } from '../../contexts/AuthContext'
import dayjs from 'dayjs'

const { Text } = Typography

interface AddFilesModalProps {
  visible: boolean
  onClose: () => void
  selectedApproval: PaymentApproval | null
}

export const AddFilesModal = ({
  visible,
  onClose,
  selectedApproval
}: AddFilesModalProps) => {
  const { user } = useAuth()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [fileDescriptions, setFileDescriptions] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)

  console.log('[AddFilesModal] Rendering with:', {
    visible,
    paymentId: selectedApproval?.payment_id,
    paymentNumber: selectedApproval?.payment?.payment_number,
    fileListCount: fileList.length
  })

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
    fileList,
    multiple: true,
    showUploadList: {
      showPreviewIcon: false,
      showRemoveIcon: true
    }
  }

  const handleSaveFiles = async () => {
    if (!selectedApproval?.payment_id || !user?.id) {
      message.error('Ошибка: не найден ID платежа или пользователя')
      return
    }

    if (fileList.length === 0) {
      message.warning('Выберите файлы для загрузки')
      return
    }

    setUploading(true)
    console.log('[AddFilesModal.handleSaveFiles] Starting upload:', {
      paymentId: selectedApproval.payment_id,
      filesCount: fileList.length,
      userId: user.id
    })

    try {
      // Add descriptions to files
      const filesWithDescriptions = fileList.map(file => ({
        ...file,
        description: fileDescriptions[file.uid] || undefined
      }))

      await processPaymentFiles(selectedApproval.payment_id, filesWithDescriptions as any, user.id)

      message.success('Файлы успешно добавлены к платежу')
      console.log('[AddFilesModal.handleSaveFiles] Upload successful')

      // Reset state and close
      setFileList([])
      setFileDescriptions({})
      onClose()
    } catch (error) {
      console.error('[AddFilesModal.handleSaveFiles] Error:', error)
      message.error('Ошибка при загрузке файлов')
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    setFileList([])
    setFileDescriptions({})
    onClose()
  }

  return (
    <Modal
      title="Добавление файлов к платежу"
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="close" onClick={handleCancel}>
          Отмена
        </Button>,
        <Button
          key="save"
          type="primary"
          onClick={handleSaveFiles}
          loading={uploading}
          disabled={fileList.length === 0}
        >
          Сохранить файлы
        </Button>
      ]}
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Text strong>
            Платёж № {selectedApproval?.payment?.payment_number} от{' '}
            {selectedApproval?.payment?.payment_date
              ? dayjs(selectedApproval.payment.payment_date).format('DD.MM.YYYY')
              : '-'}
          </Text>
          <br />
          <Text type="secondary">
            Сумма: {selectedApproval?.payment?.amount ? `${selectedApproval.payment.amount.toLocaleString('ru-RU')} ₽` : '-'}
          </Text>
        </div>

        <div style={{ padding: '20px', background: '#f5f5f5', borderRadius: '4px' }}>
          <Text type="secondary">
            <InfoCircleOutlined /> На данном этапе согласования вы можете добавлять дополнительные документы к платежу.
          </Text>
        </div>

        <div>
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />}>Выбрать файлы</Button>
          </Upload>
          {fileList.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Выбрано файлов: {fileList.length}
              </Text>
            </div>
          )}
        </div>

        {fileList.length > 0 && (
          <div>
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
      </Space>
    </Modal>
  )
}