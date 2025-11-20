import { Row, Col } from 'antd'
import { AttachmentPreview } from './AttachmentPreview'
import { RecognitionSettings } from './RecognitionSettings'
import type { PageConfig } from '../../hooks/usePageConfigs'

interface PageRange {
  start: number
  end: number
}

interface RecognitionPreviewProps {
  attachmentUrl?: string
  attachmentMimeType: string
  allPages: boolean
  pageRange: PageRange
  onAllPagesChange: (value: boolean) => void
  onPageRangeChange: (value: PageRange) => void
  pageConfigs: PageConfig[]
  onPageConfigsChange: (configs: PageConfig[]) => void
}

export const RecognitionPreview = ({
  attachmentUrl,
  attachmentMimeType,
  allPages,
  pageRange,
  onAllPagesChange,
  onPageRangeChange,
  pageConfigs,
  onPageConfigsChange
}: RecognitionPreviewProps) => {
  return (
    <Row gutter={24}>
      <Col span={12}>
        <h4>Предпросмотр файла:</h4>
        <AttachmentPreview 
          url={attachmentUrl}
          mimeType={attachmentMimeType}
          style={{ minHeight: '70vh' }}
          height="100%"
        />
      </Col>
      <Col span={12}>
        <h4>Настройки распознавания:</h4>
        <RecognitionSettings
          allPages={allPages}
          pageRange={pageRange}
          onAllPagesChange={onAllPagesChange}
          onPageRangeChange={onPageRangeChange}
          pdfUrl={attachmentUrl}
          pageConfigs={pageConfigs}
          onPageConfigsChange={onPageConfigsChange}
        />
      </Col>
    </Row>
  )
}

