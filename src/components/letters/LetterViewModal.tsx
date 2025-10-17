import { Modal, Descriptions, Tag, Typography, List, Button, Row, Col, Divider } from 'antd'
import { DownloadOutlined, FileOutlined, HistoryOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Letter } from '../../lib/supabase'
import { supabase } from '../../lib/supabase'
import { useAuditLog } from '../../hooks/useAuditLog'
import AuditLogTimeline from '../common/AuditLogTimeline'

const { Title } = Typography

interface LetterViewModalProps {
  visible: boolean
  onClose: () => void
  letter: Letter | null
}

export const LetterViewModal: React.FC<LetterViewModalProps> = ({
  visible,
  onClose,
  letter
}) => {
  // Load audit log for the letter
  const { auditLog, loading: auditLoading } = useAuditLog('letter', letter?.id)

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
          {letter.sender || '—'}
        </Descriptions.Item>

        <Descriptions.Item label="Получатель">
          {letter.recipient || '—'}
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
          {letter.attachments && letter.attachments.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <Title level={5}>Прикрепленные файлы:</Title>
              <List
                size="small"
                bordered
                dataSource={letter.attachments}
                renderItem={(item: any) => {
                  const fileSize = `Размер: ${(item.attachments.size_bytes / 1024).toFixed(2)} КБ`
                  const description = item.attachments.description
                  const descriptionText = description ? `${fileSize} • ${description}` : fileSize

                  return (
                    <List.Item
                      actions={[
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
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<FileOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                        title={item.attachments.original_name}
                        description={descriptionText}
                      />
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
    </Modal>
  )
}
