import { Checkbox, InputNumber, Space, Table, Input, Tag } from 'antd'
import { useState, useEffect } from 'react'
import * as pdfjs from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface PageRange {
  start: number
  end: number
}

export interface PageConfig {
  pageNumber: number
  description: string
  isContinuation: boolean
}

interface RecognitionSettingsProps {
  allPages: boolean
  pageRange: PageRange
  onAllPagesChange: (checked: boolean) => void
  onPageRangeChange: (range: PageRange) => void
  pdfUrl?: string
  pageConfigs?: PageConfig[]
  onPageConfigsChange?: (configs: PageConfig[]) => void
}

export const RecognitionSettings = ({
  allPages,
  pageRange,
  onAllPagesChange: _onAllPagesChange,
  onPageRangeChange,
  pdfUrl,
  pageConfigs = [],
  onPageConfigsChange
}: RecognitionSettingsProps) => {
  const [numPages, setNumPages] = useState(0)
  const [localConfigs, setLocalConfigs] = useState<PageConfig[]>(pageConfigs)
  const [lastPdfUrl, setLastPdfUrl] = useState<string>('')
  const [focusedPageNumber, setFocusedPageNumber] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Загружаем PDF только если URL изменился
    if (pdfUrl && pdfUrl !== lastPdfUrl) {
      setLastPdfUrl(pdfUrl)
      loadPdfPages(pdfUrl)
    }
  }, [pdfUrl, lastPdfUrl])

  // Обновляем localConfigs при изменении pageConfigs
  useEffect(() => {
    // Если pageConfigs пришли извне и отличаются от текущих
    if (pageConfigs.length > 0 && localConfigs.length === 0) {
      setLocalConfigs(pageConfigs)
    }
    // Если pageConfigs сброшены (длина = 0), сбрасываем и локальные
    if (pageConfigs.length === 0 && localConfigs.length > 0) {
      setLocalConfigs([])
      setLastPdfUrl('')
      setNumPages(0)
    }
  }, [pageConfigs, localConfigs.length])

  const loadPdfPages = async (url: string) => {
    setLoading(true)
    try {
      console.log('[RecognitionSettings] Loading PDF:', url)
      const pdf = await pdfjs.getDocument(url).promise
      const count = pdf.numPages
      setNumPages(count)
      
      console.log('[RecognitionSettings] PDF loaded, pages:', count, 'current configs:', localConfigs.length)
      
      // Инициализируем конфигурацию только если её нет или количество страниц изменилось
      if (localConfigs.length === 0 || localConfigs.length !== count) {
        const configs = Array.from({ length: count }, (_, i) => ({
          pageNumber: i + 1,
          description: '',
          isContinuation: false
        }))
        console.log('[RecognitionSettings] Initializing page configs:', configs.length)
        setLocalConfigs(configs)
        onPageConfigsChange?.(configs)
      }
    } catch (error) {
      console.error('[RecognitionSettings] PDF load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDescriptionChange = (pageNumber: number, description: string) => {
    const newConfigs = localConfigs.map(p => 
      p.pageNumber === pageNumber ? { ...p, description } : p
    )
    setLocalConfigs(newConfigs)
    onPageConfigsChange?.(newConfigs)
  }

  const handleContinuationChange = (pageNumber: number, checked: boolean) => {
    let newDescription = ''
    
    if (checked) {
      const prevPage = localConfigs.find(p => p.pageNumber === pageNumber - 1)
      if (prevPage?.description) {
        const baseDesc = prevPage.description.replace(/ ПРОДОЛЖЕНИЕ$/, '')
        newDescription = `${baseDesc} ПРОДОЛЖЕНИЕ`
      }
    }

    const newConfigs = localConfigs.map(p => 
      p.pageNumber === pageNumber 
        ? { 
            ...p, 
            isContinuation: checked, 
            description: checked ? newDescription : p.description 
          } 
        : p
    )
    setLocalConfigs(newConfigs)
    onPageConfigsChange?.(newConfigs)
  }

  const handleQuickTag = (tag: string) => {
    if (focusedPageNumber !== null) {
      handleDescriptionChange(focusedPageNumber, tag.toUpperCase())
    }
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
        <Input
          size="small"
          placeholder="Например: ПИСЬМО"
          value={record.description}
          onChange={(e) => handleDescriptionChange(record.pageNumber, e.target.value)}
          onFocus={() => setFocusedPageNumber(record.pageNumber)}
          disabled={record.isContinuation}
        />
      )
    },
    {
      title: 'Продолжение',
      key: 'continuation',
      width: 120,
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
    <div style={{ padding: '16px', border: '1px solid #d9d9d9', borderRadius: '4px', background: '#fafafa', width: '100%', minHeight: '70vh' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {!allPages && (
          <div>
            <div style={{ marginBottom: 8 }}>Укажите диапазон страниц:</div>
            <Space>
              <span>От</span>
              <InputNumber 
                min={1} 
                value={pageRange.start}
                onChange={(val) => onPageRangeChange({ ...pageRange, start: val || 1 })}
                style={{ width: 80 }}
              />
              <span>До</span>
              <InputNumber 
                min={pageRange.start} 
                value={pageRange.end}
                onChange={(val) => onPageRangeChange({ ...pageRange, end: val || pageRange.start })}
                style={{ width: 80 }}
              />
            </Space>
          </div>
        )}
        
        <div>
          <div style={{ marginBottom: 8, fontWeight: 500 }}>
            Настройка блоков документа: 
            {numPages > 0 ? ` (${numPages} стр.)` : loading ? ' (загрузка...)' : ''}
          </div>
          {numPages > 0 && localConfigs.length > 0 && (
            <>
              <div style={{ marginBottom: 8 }}>
                <Space size={4} wrap>
                  <span style={{ marginRight: 4 }}>Быстрые теги:</span>
                  {['Письмо', 'Требование', 'Договор', 'Счет', 'УПД', 'Акт', 'Вызов'].map(tag => (
                    <Tag
                      key={tag}
                      style={{ cursor: 'pointer', margin: 0 }}
                      onClick={() => handleQuickTag(tag)}
                      color={focusedPageNumber !== null ? 'blue' : 'default'}
                    >
                      {tag}
                    </Tag>
                  ))}
                </Space>
              </div>
              <Table
                columns={columns}
                dataSource={localConfigs}
                rowKey="pageNumber"
                pagination={false}
                scroll={{ y: 300 }}
                size="small"
                bordered
              />
            </>
          )}
        </div>

        <div style={{ marginTop: 24, padding: 16, background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 4 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#096dd9' }}>
            <strong>Информация:</strong> После нажатия кнопки "Распознать" содержимое файла будет преобразовано в текстовый формат Markdown. Вы сможете отредактировать результат перед сохранением.
          </p>
        </div>
      </Space>
    </div>
  )
}

