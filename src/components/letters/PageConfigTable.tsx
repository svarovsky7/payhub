import { Table, Input, Checkbox, Tag, Space, message } from 'antd'
import type { PageConfig } from '../../hooks/usePageConfigs'

interface PageConfigTableProps {
  pageConfigs: PageConfig[]
  selectedPageRow: number | null
  onSelectRow: (pageNumber: number) => void
  onPageDescriptionChange: (pageNumber: number, description: string) => void
  onContinuationChange: (pageNumber: number, checked: boolean) => void
}

const QUICK_TAGS = ['ПИСЬМО', 'АКТ', 'ТРЕБОВАНИЕ', 'ДОГОВОР', 'СЧЕТ', 'УПД', 'СПЕЦИФИКАЦИЯ']

export const PageConfigTable = ({
  pageConfigs,
  selectedPageRow,
  onSelectRow,
  onPageDescriptionChange,
  onContinuationChange
}: PageConfigTableProps) => {
  const handleQuickFillTag = (tag: string) => {
    if (selectedPageRow === null) {
      message.warning('Выберите страницу в таблице')
      return
    }
    onPageDescriptionChange(selectedPageRow, tag)
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f5f5f5', borderRadius: 4 }}>
        <span style={{ marginRight: 8, fontWeight: 500 }}>Быстрое заполнение:</span>
        <Space size={4} wrap>
          {QUICK_TAGS.map(tag => (
            <Tag
              key={tag}
              style={{ cursor: 'pointer', margin: 0 }}
              color="blue"
              onClick={() => handleQuickFillTag(tag)}
            >
              {tag}
            </Tag>
          ))}
        </Space>
      </div>
      <Table
        columns={[
          {
            title: 'Страница',
            dataIndex: 'pageNumber',
            key: 'pageNumber',
            width: 100
          },
          {
            title: 'Описание блока',
            key: 'description',
            render: (_: unknown, record: PageConfig) => {
              const displayValue = record.isContinuation 
                ? `${record.description} ПРОДОЛЖЕНИЕ`
                : record.description
              return (
                <Input
                  value={displayValue}
                  onChange={(e) => onPageDescriptionChange(record.pageNumber, e.target.value)}
                  placeholder="Например: ПИСЬМО"
                  disabled={record.isContinuation}
                />
              )
            }
          },
          {
            title: 'Продолжение',
            key: 'isContinuation',
            width: 120,
            render: (_: unknown, record: PageConfig) => (
              record.pageNumber > 1 ? (
                <Checkbox
                  checked={record.isContinuation}
                  onChange={(e) => onContinuationChange(record.pageNumber, e.target.checked)}
                >
                  Предыдущей
                </Checkbox>
              ) : null
            )
          }
        ]}
        dataSource={pageConfigs}
        rowKey="pageNumber"
        pagination={false}
        scroll={{ y: 'calc(70vh - 120px)' }}
        size="small"
        bordered
        onRow={(record) => ({
          onClick: () => onSelectRow(record.pageNumber),
          style: { cursor: 'pointer' }
        })}
        rowClassName={(record) => record.pageNumber === selectedPageRow ? 'ant-table-row-selected' : ''}
      />
    </div>
  )
}

