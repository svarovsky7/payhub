import React from 'react'
import { Modal, Button, Space, Image, Typography } from 'antd'
import { DownloadOutlined, FileTextOutlined, FilePdfOutlined, FileImageOutlined, FileExcelOutlined, FileWordOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

export const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext || '')) {
    return <FileImageOutlined />
  }
  if (ext === 'pdf') {
    return <FilePdfOutlined />
  }
  if (['doc', 'docx'].includes(ext || '')) {
    return <FileWordOutlined />
  }
  if (['xls', 'xlsx'].includes(ext || '')) {
    return <FileExcelOutlined />
  }
  return <FileTextOutlined />
}

interface FilePreviewModalProps {
  open: boolean
  title: string
  url: string
  type: 'image' | 'pdf' | 'other'
  onClose: () => void
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  open,
  title,
  url,
  type,
  onClose
}) => {
  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = url
    link.download = title
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Modal
      open={open}
      title={`Просмотр: ${title}`}
      footer={
        type === 'pdf' ? (
          <Space>
            <Button icon={<DownloadOutlined />} onClick={handleDownload}>
              Скачать PDF
            </Button>
            <Button onClick={onClose}>Закрыть</Button>
          </Space>
        ) : (
          <Button onClick={onClose}>Закрыть</Button>
        )
      }
      onCancel={onClose}
      width={type === 'pdf' ? 1400 : 1200}
      style={{ top: 20 }}
      styles={{
        body: type === 'pdf' ? {
          padding: 0,
          height: '75vh',
          overflow: 'hidden'
        } : undefined
      }}
    >
      {type === 'image' ? (
        <div style={{ textAlign: 'center' }}>
          <Image
            alt="preview"
            style={{ maxWidth: '100%', maxHeight: '70vh' }}
            src={url}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRklEQVR42u3SMQ0AAAzDsJU/6yGFfyFpIJHQK7mlL0kgCQIBgUBAICAQCAgEAgKBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEDAJhYAAADnbvnLfwAAAABJRU5ErkJggg=="
          />
        </div>
      ) : type === 'pdf' ? (
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
          <embed
            src={url}
            type="application/pdf"
            width="100%"
            height="100%"
            style={{ border: 'none' }}
          />
          <div style={{
            position: 'absolute',
            bottom: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.9)',
            padding: '5px 10px',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Если PDF не отображается, используйте кнопку "Скачать PDF"
            </Text>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: 64, color: '#bfbfbf', marginBottom: 16 }}>
            {getFileIcon(title)}
          </div>
          <Title level={4}>{title}</Title>
          <Text type="secondary">
            Предварительный просмотр недоступен для этого типа файла
          </Text>
          <div style={{ marginTop: 24 }}>
            <Button icon={<DownloadOutlined />} onClick={handleDownload}>
              Скачать файл
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}