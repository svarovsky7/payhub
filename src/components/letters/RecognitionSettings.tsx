import { Checkbox, InputNumber, Space } from 'antd'

interface PageRange {
  start: number
  end: number
}

interface RecognitionSettingsProps {
  allPages: boolean
  pageRange: PageRange
  onAllPagesChange: (checked: boolean) => void
  onPageRangeChange: (range: PageRange) => void
}

export const RecognitionSettings = ({
  allPages,
  pageRange,
  onAllPagesChange,
  onPageRangeChange
}: RecognitionSettingsProps) => {
  return (
    <div style={{ padding: '16px', border: '1px solid #d9d9d9', borderRadius: '4px', background: '#fafafa' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Checkbox checked={allPages} onChange={(e) => onAllPagesChange(e.target.checked)}>
            Распознать все страницы
          </Checkbox>
        </div>
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
        <div style={{ marginTop: 24, padding: 16, background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 4 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#096dd9' }}>
            <strong>Информация:</strong> После нажатия кнопки "Распознать" содержимое файла будет преобразовано в текстовый формат Markdown. Вы сможете отредактировать результат перед сохранением.
          </p>
        </div>
      </Space>
    </div>
  )
}

