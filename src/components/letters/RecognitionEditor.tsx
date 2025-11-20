import { Row, Col, Tabs } from 'antd'
import { AttachmentPreview } from './AttachmentPreview'
import { MarkdownEditor } from './MarkdownEditor'
import { PageConfigTable } from './PageConfigTable'
import type { PageConfig } from '../../hooks/usePageConfigs'

interface RecognitionEditorProps {
  attachmentUrl?: string
  attachmentMimeType: string
  markdown: string
  onMarkdownChange: (value: string) => void
  pageConfigs: PageConfig[]
  selectedPageRow: number | null
  onSelectRow: (pageNumber: number) => void
  onPageDescriptionChange: (pageNumber: number, description: string) => void
  onContinuationChange: (pageNumber: number, checked: boolean) => void
}

export const RecognitionEditor = ({
  attachmentUrl,
  attachmentMimeType,
  markdown,
  onMarkdownChange,
  pageConfigs,
  selectedPageRow,
  onSelectRow,
  onPageDescriptionChange,
  onContinuationChange
}: RecognitionEditorProps) => {
  return (
    <Row gutter={24}>
      <Col span={12}>
        <h4>Предпросмотр исходного файла:</h4>
        <AttachmentPreview 
          url={attachmentUrl}
          mimeType={attachmentMimeType}
        />
      </Col>
      <Col span={12}>
        <Tabs
          defaultActiveKey="1"
          items={[
            {
              key: '1',
              label: 'Распознанный текст (Markdown)',
              children: (
                <div style={{ marginTop: 8 }}>
                  <MarkdownEditor value={markdown} onChange={onMarkdownChange} />
                </div>
              )
            },
            {
              key: '2',
              label: 'Список страниц',
              children: (
                <PageConfigTable
                  pageConfigs={pageConfigs}
                  selectedPageRow={selectedPageRow}
                  onSelectRow={onSelectRow}
                  onPageDescriptionChange={onPageDescriptionChange}
                  onContinuationChange={onContinuationChange}
                />
              )
            }
          ]}
        />
      </Col>
    </Row>
  )
}

