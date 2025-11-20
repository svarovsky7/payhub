import { Modal, Button, Space, Tabs } from 'antd'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PageConfigTable } from '../letters/PageConfigTable'
import type { PageConfig } from '../../hooks/usePageConfigs'

interface MarkdownViewModalProps {
  visible: boolean
  onCancel: () => void
  markdown: string | null
  isEditing: boolean
  editedMarkdown: string
  onEditedMarkdownChange: (value: string) => void
  onStartEditing: () => void
  onSave: () => void
  pageConfigs: PageConfig[]
  selectedPageRow: number | null
  onSelectRow: (pageNumber: number) => void
  onPageDescriptionChange: (pageNumber: number, description: string) => void
  onContinuationChange: (pageNumber: number, checked: boolean) => void
}

export const MarkdownViewModal = ({
  visible,
  onCancel,
  markdown,
  isEditing,
  editedMarkdown,
  onEditedMarkdownChange,
  onStartEditing,
  onSave,
  pageConfigs,
  selectedPageRow,
  onSelectRow,
  onPageDescriptionChange,
  onContinuationChange
}: MarkdownViewModalProps) => {
  return (
    <Modal
      title="Markdown документ"
      open={visible}
      onCancel={onCancel}
      width="90vw"
      footer={
        <Space>
          <Button onClick={onCancel}>Закрыть</Button>
          {isEditing ? (
            <Button type="primary" onClick={onSave}>Сохранить</Button>
          ) : (
            <Button type="primary" onClick={onStartEditing}>Редактировать текст</Button>
          )}
        </Space>
      }
      style={{ top: 20 }}
    >
      <Tabs
        defaultActiveKey="1"
        items={[
          {
            key: '1',
            label: 'Распознанный текст (Markdown)',
            children: (
              <div 
                style={{ 
                  height: 'calc(90vh - 160px)', 
                  overflow: 'auto', 
                  padding: '20px 24px',
                  background: '#fff',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}
                className="markdown-preview"
              >
                {isEditing ? (
                  <textarea
                    value={editedMarkdown}
                    onChange={(e) => onEditedMarkdownChange(e.target.value)}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: '1px solid #d9d9d9',
                      borderRadius: '4px',
                      padding: '12px',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      resize: 'none'
                    }}
                  />
                ) : (
                  markdown && (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({...props}) => (
                          <table style={{ 
                            borderCollapse: 'collapse', 
                            width: '100%', 
                            marginBottom: '16px',
                            border: '1px solid #e8e8e8'
                          }} {...props} />
                        ),
                        thead: ({...props}) => (
                          <thead style={{ background: '#fafafa' }} {...props} />
                        ),
                        th: ({...props}) => (
                          <th style={{ 
                            border: '1px solid #e8e8e8', 
                            padding: '8px 12px',
                            textAlign: 'left',
                            fontWeight: 600
                          }} {...props} />
                        ),
                        td: ({...props}) => (
                          <td style={{ 
                            border: '1px solid #e8e8e8', 
                            padding: '8px 12px'
                          }} {...props} />
                        ),
                        h1: ({...props}) => (
                          <h1 style={{ 
                            fontSize: '24px', 
                            fontWeight: 600, 
                            marginTop: '24px', 
                            marginBottom: '16px',
                            borderBottom: '1px solid #e8e8e8',
                            paddingBottom: '8px'
                          }} {...props} />
                        ),
                        h2: ({...props}) => (
                          <h2 style={{ 
                            fontSize: '20px', 
                            fontWeight: 600, 
                            marginTop: '20px', 
                            marginBottom: '12px'
                          }} {...props} />
                        ),
                        h3: ({...props}) => (
                          <h3 style={{ 
                            fontSize: '16px', 
                            fontWeight: 600, 
                            marginTop: '16px', 
                            marginBottom: '8px'
                          }} {...props} />
                        ),
                        p: ({...props}) => (
                          <p style={{ marginBottom: '12px' }} {...props} />
                        ),
                        code: ({ inline, ...props}: any) => (
                          inline 
                            ? <code style={{ 
                                background: '#f5f5f5', 
                                padding: '2px 6px', 
                                borderRadius: '3px',
                                fontSize: '13px'
                              }} {...props} />
                            : <code style={{ 
                                display: 'block',
                                background: '#f5f5f5', 
                                padding: '12px', 
                                borderRadius: '4px',
                                fontSize: '13px',
                                overflow: 'auto'
                              }} {...props} />
                        ),
                        ul: ({...props}) => (
                          <ul style={{ paddingLeft: '24px', marginBottom: '12px' }} {...props} />
                        ),
                        ol: ({...props}) => (
                          <ol style={{ paddingLeft: '24px', marginBottom: '12px' }} {...props} />
                        ),
                        li: ({...props}) => (
                          <li style={{ marginBottom: '4px' }} {...props} />
                        )
                      }}
                    >
                      {markdown}
                    </ReactMarkdown>
                  )
                )}
              </div>
            )
          },
          {
            key: '2',
            label: 'Список страниц',
            children: (
              <div style={{ height: 'calc(90vh - 160px)', overflow: 'auto', padding: '12px' }}>
                <PageConfigTable
                  pageConfigs={pageConfigs}
                  selectedPageRow={selectedPageRow}
                  onSelectRow={onSelectRow}
                  onPageDescriptionChange={onPageDescriptionChange}
                  onContinuationChange={onContinuationChange}
                />
              </div>
            )
          }
        ]}
      />
    </Modal>
  )
}

