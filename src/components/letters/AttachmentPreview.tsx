import { Button, Image } from 'antd'
import { FileOutlined } from '@ant-design/icons'

interface AttachmentPreviewProps {
  url?: string
  mimeType: string
}

const isImage = (mimeType: string) => mimeType.startsWith('image/')
const isPdf = (mimeType: string) => mimeType === 'application/pdf'

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

