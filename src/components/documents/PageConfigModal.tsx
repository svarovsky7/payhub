import { Modal, Table, Input, Checkbox, Button, Space, Tag } from 'antd'
import { useState, useEffect } from 'react'
import * as pdfjs from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PageConfig {
  pageNumber: number
  description: string
  isContinuation: boolean
}

interface PageConfigModalProps {
  visible: boolean
  pdfUrl: string
  onConfirm: (pages: PageConfig[]) => void
  onCancel: () => void
}

export const PageConfigModal = ({ visible, pdfUrl, onConfirm, onCancel }: PageConfigModalProps) => {
  const [numPages, setNumPages] = useState(0)
  const [pages, setPages] = useState<PageConfig[]>([])

  useEffect(() => {
    if (visible && pdfUrl) {
      loadPdf(pdfUrl)
    }
  }, [visible, pdfUrl])

  const loadPdf = async (url: string) => {
    try {
      const pdf = await pdfjs.getDocument(url).promise
      const count = pdf.numPages
      setNumPages(count)
      setPages(Array.from({ length: count }, (_, i) => ({
        pageNumber: i + 1,
        description: '',
        isContinuation: false
      })))
    } catch (error) {
      console.error('PDF load error:', error)
    }
  }

  const handleDescriptionChange = (pageNumber: number, description: string) => {
    setPages(prev => prev.map(p => 
      p.pageNumber === pageNumber ? { ...p, description } : p
    ))
  }

  const handleContinuationChange = (pageNumber: number, checked: boolean) => {
    setPages(prev => prev.map(p => 
      p.pageNumber === pageNumber ? { ...p, isContinuation: checked } : p
    ))
  }

  const columns = [
    {
      title: 'Стр',
      dataIndex: 'pageNumber',
      key: 'pageNumber',
      width: 60
    },
    {
      title: 'Описание блока',
      key: 'description',
      width: 240,
      render: (_: unknown, record: PageConfig) => (
        <Space direction="vertical" size={4} style={{ width: '100%' }}>
          <Input
            size="small"
            placeholder="Например: ПИСЬМО"
            value={record.description}
            onChange={(e) => handleDescriptionChange(record.pageNumber, e.target.value)}
            disabled={record.isContinuation}
          />
          {!record.isContinuation && (
            <Space size={4} wrap>
              {['Письмо', 'Требование', 'Договор', 'Счет', 'УПД'].map(tag => (
                <Tag
                  key={tag}
                  style={{ cursor: 'pointer', margin: 0 }}
                  onClick={() => handleDescriptionChange(record.pageNumber, tag.toUpperCase())}
                >
                  {tag}
                </Tag>
              ))}
            </Space>
          )}
        </Space>
      )
    },
    {
      title: 'Продолжение',
      key: 'continuation',
      width: 150,
      render: (_: unknown, record: PageConfig) => (
        record.pageNumber > 1 ? (
          <Checkbox
            checked={record.isContinuation}
            onChange={(e) => handleContinuationChange(record.pageNumber, e.target.checked)}
          >
            Предыдущей
          </Checkbox>
        ) : null
      )
    }
  ]

  return (
    <Modal
      title="Настройки распознавания"
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>Отмена</Button>,
        <Button key="submit" type="primary" onClick={() => onConfirm(pages)}>
          Распознать
        </Button>
      ]}
    >
      <div style={{ marginBottom: 12, padding: 12, background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 4 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#096dd9' }}>
          <strong>Информация:</strong> После нажатия кнопки "Распознать" содержимое файла будет преобразовано в текстовый формат Markdown. 
          Вы сможете отредактировать результат позже.
        </p>
      </div>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>Настройка блоков документа: ({numPages} стр.)</div>
      <Table
        columns={columns}
        dataSource={pages}
        rowKey="pageNumber"
        pagination={false}
        scroll={{ y: 400 }}
        size="small"
        bordered
      />
    </Modal>
  )
}

