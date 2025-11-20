import { List } from 'antd'
import { AttachmentCard } from './AttachmentCard'

interface Attachment {
  id: string
  original_name: string
  storage_path: string
  mime_type: string
  url?: string
  recognized?: boolean
  recognizing?: boolean
  progress?: number
}

interface AttachmentsListProps {
  attachments: Attachment[]
  onSelectAttachment: (attachment: Attachment) => void
}

export const AttachmentsList = ({ attachments, onSelectAttachment }: AttachmentsListProps) => {
  return (
    <div>
      <h4>Выберите вложение для распознавания:</h4>
      <List
        grid={{ gutter: 16, xs: 2, sm: 3, md: 4, lg: 5, xl: 6, xxl: 6 }}
        dataSource={attachments.filter(att => !att.mime_type.includes('markdown'))}
        renderItem={(att) => (
          <List.Item>
            <AttachmentCard
              id={att.id}
              originalName={att.original_name}
              mimeType={att.mime_type}
              url={att.url}
              recognized={att.recognized}
              recognizing={att.recognizing}
              progress={att.progress}
              onClick={() => onSelectAttachment(att)}
            />
          </List.Item>
        )}
      />
    </div>
  )
}

