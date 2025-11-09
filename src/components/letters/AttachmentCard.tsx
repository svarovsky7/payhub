import { Card, Space, Tooltip, Progress, Image } from 'antd'
import { FileOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons'
import { truncateText } from '../../utils/textUtils'

interface AttachmentCardProps {
  id: string
  originalName: string
  mimeType: string
  url?: string
  recognized?: boolean
  recognizing?: boolean
  progress?: number
  onClick: () => void
}

const isImage = (mimeType: string) => mimeType.startsWith('image/')
const isPdf = (mimeType: string) => mimeType === 'application/pdf'

export const AttachmentCard = ({
  originalName,
  mimeType,
  url,
  recognized,
  recognizing,
  progress,
  onClick
}: AttachmentCardProps) => {
  return (
    <Card
      hoverable
      onClick={() => !recognizing && onClick()}
      style={{ 
        cursor: recognizing ? 'not-allowed' : 'pointer',
        border: recognized ? '2px solid #52c41a' : recognizing ? '2px solid #1890ff' : undefined,
        background: recognized ? '#f6ffed' : recognizing ? '#e6f7ff' : undefined,
        opacity: recognizing ? 0.8 : 1
      }}
      cover={
        isImage(mimeType) && url ? (
          <div style={{ height: 150, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
            <Image src={url} preview={false} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        ) : isPdf(mimeType) && url ? (
          <div style={{ height: 150, overflow: 'hidden', position: 'relative', background: '#fff' }}>
            <iframe 
              src={`${url}#page=1&view=FitH`}
              style={{ 
                width: '100%', 
                height: '300px',
                border: 'none',
                pointerEvents: 'none',
                transform: 'scale(0.5)',
                transformOrigin: '0 0'
              }}
              title={`Preview ${originalName}`}
            />
          </div>
        ) : (
          <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
            <FileOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
          </div>
        )
      }
    >
      <Card.Meta
        title={
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Space>
              <Tooltip title={originalName}>{truncateText(originalName, 12)}</Tooltip>
              {recognized && <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />}
              {recognizing && <LoadingOutlined style={{ color: '#1890ff', fontSize: 16 }} />}
            </Space>
            {recognizing && <Progress percent={progress || 0} size="small" status="active" showInfo={false} />}
          </Space>
        }
      />
    </Card>
  )
}

