import React from 'react'
import { Modal, Spin, Typography } from 'antd'
import { FileImageOutlined, FilePdfOutlined, FileTextOutlined, FileUnknownOutlined } from '@ant-design/icons'

const { Text } = Typography

interface FilePreviewModalProps {
  visible: boolean
  onClose: () => void
  fileUrl: string | null
  fileName: string
  fileType?: string
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  visible,
  onClose,
  fileUrl,
  fileName,
  fileType
}) => {
  // Log only when actually opening with content
  if (visible && fileUrl) {
    console.log('[FilePreviewModal] Opening preview:', {
      fileName,
      fileUrl,
      fileType
    })
  }

  const getFileIcon = () => {
    if (!fileType) return <FileUnknownOutlined style={{ fontSize: 48 }} />

    if (fileType.includes('image')) {
      return <FileImageOutlined style={{ fontSize: 48 }} />
    } else if (fileType.includes('pdf')) {
      return <FilePdfOutlined style={{ fontSize: 48 }} />
    } else if (fileType.includes('text') || fileType.includes('document')) {
      return <FileTextOutlined style={{ fontSize: 48 }} />
    }

    return <FileUnknownOutlined style={{ fontSize: 48 }} />
  }

  const renderContent = () => {
    if (!fileUrl) {
      return (
        <div style={{ textAlign: 'center', padding: 50 }}>
          <Spin size="large" />
        </div>
      )
    }

    // For images, display them directly with loading state
    if (fileType && fileType.includes('image')) {
      return (
        <div style={{ textAlign: 'center', position: 'relative' }}>
          <Spin
            size="large"
            spinning={true}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1
            }}
          />
          <img
            src={fileUrl}
            alt={fileName}
            style={{ maxWidth: '100%', maxHeight: '70vh', position: 'relative', zIndex: 2 }}
            onLoad={(e) => {
              const target = e.target as HTMLImageElement
              // Hide spinner when image loads
              const spinner = target.previousElementSibling as HTMLElement
              if (spinner) spinner.style.display = 'none'
            }}
            onError={(e) => {
              console.error('[FilePreviewModal] Image load error:', e)
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
        </div>
      )
    }

    // For PDFs, use iframe
    if (fileType && fileType.includes('pdf')) {
      return (
        <iframe
          src={fileUrl}
          title={fileName}
          width="100%"
          height="600px"
          style={{ border: 'none' }}
          onError={(e) => {
            console.error('[FilePreviewModal] PDF load error:', e)
          }}
        />
      )
    }

    // For other file types, show download link
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        {getFileIcon()}
        <div style={{ marginTop: 20 }}>
          <Text>Предпросмотр недоступен для данного типа файла</Text>
        </div>
        <div style={{ marginTop: 10 }}>
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            Открыть в новой вкладке
          </a>
        </div>
      </div>
    )
  }

  return (
    <Modal
      title={fileName}
      open={visible}
      onCancel={onClose}
      width={900}
      footer={null}
      destroyOnHidden
      centered
    >
      {renderContent()}
    </Modal>
  )
}