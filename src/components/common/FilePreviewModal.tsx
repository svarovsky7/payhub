import React from 'react'
import { Modal, Button, Space, Image, Typography } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { getFileIcon } from './fileIcons'

const { Text, Title } = Typography

interface FilePreviewModalProps {
  open: boolean
  title: string
  url: string
  type: 'image' | 'pdf' | 'markdown' | 'doc' | 'other'
  onClose: () => void
  content?: string
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  open,
  title,
  url,
  type,
  onClose,
  content
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
        type === 'pdf' || type === 'doc' ? (
          <Space>
            <Button icon={<DownloadOutlined />} onClick={handleDownload}>
              Скачать {type === 'pdf' ? 'PDF' : 'файл'}
            </Button>
            <Button onClick={onClose}>Закрыть</Button>
          </Space>
        ) : (
          <Button onClick={onClose}>Закрыть</Button>
        )
      }
      onCancel={onClose}
      width={type === 'pdf' || type === 'doc' ? 1400 : 1200}
      style={{ top: 20 }}
      styles={{
        body: type === 'pdf' || type === 'doc' ? {
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
      ) : type === 'markdown' ? (
        <div style={{ 
          padding: '24px', 
          background: '#fafafa', 
          borderRadius: '4px',
          maxHeight: '70vh',
          overflowY: 'auto'
        }}>
          <pre style={{ 
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            fontFamily: 'monospace',
            fontSize: '13px',
            lineHeight: '1.6',
            margin: 0,
            background: '#fff',
            padding: '16px',
            borderRadius: '4px',
            border: '1px solid #e0e0e0'
          }}>
            {content || 'Содержимое файла недоступно'}
          </pre>
        </div>
      ) : type === 'doc' ? (
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
          <iframe
            src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`}
            width="100%"
            height="100%"
            style={{ border: 'none' }}
            title="Document Preview"
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
              Если документ не отображается, используйте кнопку "Скачать файл"
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