import { Button, Image, Typography } from 'antd'
import { FileOutlined } from '@ant-design/icons'

const { Text } = Typography

interface AttachmentPreviewProps {
  url?: string
  mimeType: string
}

const isImage = (mimeType: string) => mimeType.startsWith('image/')
const isPdf = (mimeType: string) => mimeType === 'application/pdf'
const isDoc = (mimeType: string) => 
  mimeType === 'application/msword' || 
  mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export const AttachmentPreview = ({ url, mimeType }: AttachmentPreviewProps) => {
  return (
    <div style={{ maxHeight: '60vh', overflow: 'auto', border: '1px solid #d9d9d9', borderRadius: '4px', background: '#fff' }}>
      {url && isImage(mimeType) ? (
        <Image src={url} style={{ width: '100%' }} />
      ) : url && isPdf(mimeType) ? (
        <iframe 
          src={url} 
          style={{ width: '100%', height: '60vh', border: 'none' }}
          title="PDF Preview"
        />
      ) : url && isDoc(mimeType) ? (
        <div style={{ height: '60vh', width: '100%', position: 'relative' }}>
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
              Если документ не отображается, откройте в новой вкладке
            </Text>
          </div>
        </div>
      ) : (
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <FileOutlined style={{ fontSize: 64, color: '#d9d9d9', marginBottom: 16 }} />
          <p>Предпросмотр недоступен для этого типа файла</p>
          <Button href={url} target="_blank" type="link">
            Открыть в новой вкладке
          </Button>
        </div>
      )}
    </div>
  )
}

