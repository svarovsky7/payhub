import { useState, useMemo, useEffect } from 'react'
import { Modal, Descriptions, Tag, Typography, List, Button, Row, Col, Divider, Collapse, message, Popconfirm } from 'antd'
import { DownloadOutlined, HistoryOutlined, EyeOutlined, FileTextOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Letter } from '../../lib/supabase'
import { supabase } from '../../lib/supabase'
import { useAuditLog } from '../../hooks/useAuditLog'
import AuditLogTimeline from '../common/AuditLogTimeline'
import { FilePreviewModal, getFileIcon } from '../common/FilePreviewModal'
import { deleteLetterAttachment } from '../../services/letter/letterFiles'

const { Title } = Typography

interface LetterViewModalProps {
  visible: boolean
  onClose: () => void
  letter: Letter | null
  onFileDeleted?: () => void
}

export const LetterViewModal: React.FC<LetterViewModalProps> = ({
  visible,
  onClose,
  letter,
  onFileDeleted
}) => {
  // Load audit log for the letter
  const { auditLog, loading: auditLoading, refresh: refreshAuditLog } = useAuditLog('letter', letter?.id)
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: 'image' | 'pdf' | 'markdown' | 'other'; content?: string } | null>(null)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)

  // Обновляем историю при изменении вложений письма
  useEffect(() => {
    if (visible && letter?.id) {
      refreshAuditLog()
    }
  }, [letter?.attachments, visible])

  // Group attachments: identify parent files and their recognized markdown children
  const groupedAttachments = useMemo(() => {
    if (!letter?.attachments) return []

    const markdownFiles = letter.attachments.filter((item: any) => 
      item.attachments.mime_type === 'text/markdown'
    )
    
    const parentFiles = letter.attachments.filter((item: any) => 
      item.attachments.mime_type !== 'text/markdown'
    )

    return parentFiles.map((parentItem: any) => {
      const parentName = parentItem.attachments.original_name
      const childrenMd = markdownFiles.filter((mdItem: any) => {
        const mdDescription = mdItem.attachments.description || ''
        return mdDescription.includes(parentName)
      })

      return {
        parent: parentItem,
        children: childrenMd
      }
    })
  }, [letter?.attachments])

  if (!letter) return null

  const handleDownloadFile = async (storagePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .download(storagePath)

      if (error) throw error

      // Create download link
      const url = window.URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('[LetterViewModal.handleDownloadFile] Error:', error)
    }
  }

  const handlePreviewFile = async (storagePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .download(storagePath)

      if (error) throw error

      const url = window.URL.createObjectURL(data)
      const ext = fileName.split('.').pop()?.toLowerCase()
      
      let type: 'image' | 'pdf' | 'markdown' | 'other' = 'other'
      let content: string | undefined
      
      if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext || '')) {
        type = 'image'
      } else if (ext === 'pdf') {
        type = 'pdf'
      } else if (ext === 'md' || ext === 'markdown') {
        type = 'markdown'
        content = await data.text()
      }

      setPreviewFile({ url, name: fileName, type, content })
    } catch (error) {
      console.error('[LetterViewModal.handlePreviewFile] Error:', error)
    }
  }

  const handleDeleteFile = async (attachmentId: string, storagePath: string, fileName: string) => {
    if (!letter?.id) return
    
    try {
      setDeletingFile(attachmentId)
      await deleteLetterAttachment(attachmentId, storagePath, letter.id)
      message.success(`Файл "${fileName}" удален`)
      
      // Обновить данные
      onFileDeleted?.()
    } catch (error) {
      console.error('[LetterViewModal.handleDeleteFile] Error:', error)
      message.error('Ошибка удаления файла')
    } finally {
      setDeletingFile(null)
    }
  }

  const getSenderDisplay = () => {
    if (letter.sender_type === 'contractor' && letter.sender_contractor) {
      return letter.sender_contractor.name
    }
    return letter.sender || '—'
  }

  const getRecipientDisplay = () => {
    if (letter.recipient_type === 'contractor' && letter.recipient_contractor) {
      return letter.recipient_contractor.name
    }
    return letter.recipient || '—'
  }

  return (
    <Modal
      title="Просмотр письма"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Закрыть
        </Button>
      ]}
      width={1200}
    >
      <Row gutter={24}>
        <Col span={14}>
          <Descriptions bordered column={2}>
        <Descriptions.Item label="Направление" span={2}>
          <Tag color={letter.direction === 'incoming' ? 'blue' : 'green'}>
            {letter.direction === 'incoming' ? 'Входящее' : 'Исходящее'}
          </Tag>
        </Descriptions.Item>

        <Descriptions.Item label="Номер письма">
          {letter.number}
        </Descriptions.Item>

        <Descriptions.Item label="Рег. номер">
          {letter.reg_number || '—'}
        </Descriptions.Item>

        <Descriptions.Item label="Дата письма">
          {dayjs(letter.letter_date).format('DD.MM.YYYY')}
        </Descriptions.Item>

        <Descriptions.Item label="Дата регистрации">
          {letter.reg_date ? dayjs(letter.reg_date).format('DD.MM.YYYY') : '—'}
        </Descriptions.Item>

        <Descriptions.Item label="Регламентный срок ответа" span={2}>
          {letter.response_deadline ? dayjs(letter.response_deadline).format('DD.MM.YYYY') : '—'}
        </Descriptions.Item>

        <Descriptions.Item label="Статус" span={2}>
          {letter.status ? (
            <Tag color={letter.status.color || 'default'}>
              {letter.status.name}
            </Tag>
          ) : '—'}
        </Descriptions.Item>

        <Descriptions.Item label="Тема" span={2}>
          {letter.subject || '—'}
        </Descriptions.Item>

        <Descriptions.Item label="Содержание" span={2}>
          <Typography.Paragraph
            ellipsis={{ rows: 4, expandable: true, symbol: 'Читать полностью' }}
            style={{ marginBottom: 0 }}
          >
            {letter.content || '—'}
          </Typography.Paragraph>
        </Descriptions.Item>

        <Descriptions.Item label="Отправитель">
          {getSenderDisplay()}
        </Descriptions.Item>

        <Descriptions.Item label="Получатель">
          {getRecipientDisplay()}
        </Descriptions.Item>

        <Descriptions.Item label="Проект" span={2}>
          {letter.project?.name || '—'}
        </Descriptions.Item>

        <Descriptions.Item label="Ответственный" span={2}>
          {letter.responsible_user?.full_name || letter.responsible_person_name || '—'}
        </Descriptions.Item>

        <Descriptions.Item label={letter.direction === 'incoming' ? 'Способ доставки' : 'Способ отправки'}>
          {letter.delivery_method || '—'}
        </Descriptions.Item>

        <Descriptions.Item label="Создано">
          {dayjs(letter.created_at).format('DD.MM.YYYY HH:mm')}
        </Descriptions.Item>

        <Descriptions.Item label="Автор">
          {letter.creator?.full_name || '—'}
        </Descriptions.Item>

        <Descriptions.Item label="Обновлено">
          {dayjs(letter.updated_at).format('DD.MM.YYYY HH:mm')}
        </Descriptions.Item>
          </Descriptions>

          {/* Attachments */}
          {groupedAttachments.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <Title level={5}>Прикрепленные файлы:</Title>
              <List
                size="small"
                bordered
                dataSource={groupedAttachments}
                renderItem={(group: any) => {
                  const item = group.parent
                  const hasRecognizedText = group.children.length > 0
                  const fileSize = `Размер: ${(item.attachments.size_bytes / 1024).toFixed(2)} КБ`
                  const description = item.attachments.description
                  const descriptionText = description ? `${fileSize} • ${description}` : fileSize

                  return (
                    <List.Item
                      style={{
                        display: 'block',
                        background: hasRecognizedText ? '#f6ffed' : undefined,
                        borderLeft: hasRecognizedText ? '3px solid #52c41a' : undefined
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <List.Item.Meta
                          avatar={getFileIcon(item.attachments.original_name)}
                          title={item.attachments.original_name}
                          description={descriptionText}
                        />
                        <div>
                          <Button
                            key="preview"
                            type="link"
                            icon={<EyeOutlined />}
                            onClick={() => handlePreviewFile(
                              item.attachments.storage_path,
                              item.attachments.original_name
                            )}
                          >
                            Просмотр
                          </Button>
                          <Button
                            key="download"
                            type="link"
                            icon={<DownloadOutlined />}
                            onClick={() => handleDownloadFile(
                              item.attachments.storage_path,
                              item.attachments.original_name
                            )}
                          >
                            Скачать
                          </Button>
                          <Popconfirm
                            title="Удалить файл?"
                            description={`Вы уверены, что хотите удалить "${item.attachments.original_name}"?`}
                            onConfirm={() => handleDeleteFile(
                              item.attachments.id,
                              item.attachments.storage_path,
                              item.attachments.original_name
                            )}
                            okText="Да"
                            cancelText="Нет"
                          >
                            <Button
                              key="delete"
                              type="link"
                              danger
                              icon={<DeleteOutlined />}
                              loading={deletingFile === item.attachments.id}
                            >
                              Удалить
                            </Button>
                          </Popconfirm>
                        </div>
                      </div>
                      
                      {hasRecognizedText && (
                        <Collapse
                          ghost
                          size="small"
                          style={{ marginTop: 8 }}
                          items={[
                            {
                              key: 'recognized',
                              label: (
                                <span style={{ fontSize: 12, color: '#52c41a' }}>
                                  <FileTextOutlined /> Распознанный текст ({group.children.length})
                                </span>
                              ),
                              children: (
                                <List
                                  size="small"
                                  dataSource={group.children}
                                  renderItem={(mdItem: any) => (
                                    <List.Item
                                      actions={[
                                        <Button
                                          key="preview-md"
                                          type="link"
                                          size="small"
                                          icon={<EyeOutlined />}
                                          onClick={() => handlePreviewFile(
                                            mdItem.attachments.storage_path,
                                            mdItem.attachments.original_name
                                          )}
                                        >
                                          Просмотр
                                        </Button>,
                                        <Button
                                          key="download-md"
                                          type="link"
                                          size="small"
                                          icon={<DownloadOutlined />}
                                          onClick={() => handleDownloadFile(
                                            mdItem.attachments.storage_path,
                                            mdItem.attachments.original_name
                                          )}
                                        >
                                          Скачать
                                        </Button>,
                                        <Popconfirm
                                          key="delete-md"
                                          title="Удалить файл?"
                                          description={`Вы уверены, что хотите удалить "${mdItem.attachments.original_name}"?`}
                                          onConfirm={() => handleDeleteFile(
                                            mdItem.attachments.id,
                                            mdItem.attachments.storage_path,
                                            mdItem.attachments.original_name
                                          )}
                                          okText="Да"
                                          cancelText="Нет"
                                        >
                                          <Button
                                            type="link"
                                            size="small"
                                            danger
                                            icon={<DeleteOutlined />}
                                            loading={deletingFile === mdItem.attachments.id}
                                          >
                                            Удалить
                                          </Button>
                                        </Popconfirm>
                                      ]}
                                    >
                                      <List.Item.Meta
                                        avatar={<FileTextOutlined style={{ fontSize: 20, color: '#52c41a' }} />}
                                        title={<span style={{ fontSize: 13 }}>{mdItem.attachments.original_name}</span>}
                                        description={
                                          <span style={{ fontSize: 12 }}>
                                            Размер: {(mdItem.attachments.size_bytes / 1024).toFixed(2)} КБ
                                          </span>
                                        }
                                      />
                                    </List.Item>
                                  )}
                                />
                              )
                            }
                          ]}
                        />
                      )}
                    </List.Item>
                  )
                }}
              />
            </div>
          )}
        </Col>

        <Col span={10}>
          <div style={{
            padding: '16px',
            background: '#fafafa',
            borderRadius: '8px',
            minHeight: '500px',
            maxHeight: '70vh',
            overflowY: 'auto'
          }}>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <HistoryOutlined style={{ fontSize: 18 }} />
              <Title level={5} style={{ margin: 0 }}>История письма</Title>
            </div>
            <Divider style={{ margin: '12px 0' }} />
            <AuditLogTimeline auditLog={auditLog} loading={auditLoading} />
          </div>
        </Col>
      </Row>

      {previewFile && (
        <FilePreviewModal
          open={!!previewFile}
          title={previewFile.name}
          url={previewFile.url}
          type={previewFile.type}
          content={previewFile.content}
          onClose={() => {
            if (previewFile.url) {
              window.URL.revokeObjectURL(previewFile.url)
            }
            setPreviewFile(null)
          }}
        />
      )}
    </Modal>
  )
}
