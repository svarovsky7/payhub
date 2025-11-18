import { Modal, Table, Input, Checkbox, Button } from 'antd'
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
      title: 'Страница',
      dataIndex: 'pageNumber',
      key: 'pageNumber',
      width: 100
    },
    {
      title: 'Описание блока',
      key: 'description',
      render: (_: unknown, record: PageConfig) => (
        <Input
          placeholder="Например: ПИСЬМО"
          value={record.description}
          onChange={(e) => handleDescriptionChange(record.pageNumber, e.target.value)}
          disabled={record.isContinuation}
        />
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
      <div style={{ marginBottom: 16 }}>
        <strong>Распознать все страницы ({numPages})</strong>
        <div style={{ marginTop: 8, color: '#666' }}>
          Информация: После нажатия кнопки "Распознать" содержимое файла будет преобразовано в текстовый формат Markdown. 
          Вы сможете отредактировать результат позже.
        </div>
      </div>
      <Table
        columns={columns}
        dataSource={pages}
        rowKey="pageNumber"
        pagination={false}
        scroll={{ y: 400 }}
        size="small"
      />
    </Modal>
  )
}

