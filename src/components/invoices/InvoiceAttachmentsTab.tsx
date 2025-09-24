import { Table, Button, Space, Tag, Empty, Modal, Tooltip } from 'antd'
import { FileOutlined, DownloadOutlined, EyeOutlined, DeleteOutlined, FileImageOutlined, FilePdfOutlined, FileTextOutlined, FileExcelOutlined, FileWordOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

interface AttachmentData {
  id: string
  original_name: string
  storage_path: string
  size_bytes: number
  mime_type: string
  description?: string
  created_at: string
  source?: string
  source_label?: string
}

interface InvoiceAttachmentsTabProps {
  attachments: AttachmentData[]
  loadingAttachments: boolean
  onPreview: (attachment: AttachmentData) => void
  onDownload: (attachment: AttachmentData) => void
  onDelete: (attachment: AttachmentData) => void
  formatFileSize: (bytes: number) => string
}

// Функция для получения иконки файла по типу
const getFileIcon = (mimeType: string, fileName: string) => {
  if (mimeType.startsWith('image/')) return <FileImageOutlined style={{ fontSize: 18, color: '#52c41a' }} />
  if (mimeType === 'application/pdf') return <FilePdfOutlined style={{ fontSize: 18, color: '#ff4d4f' }} />

  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext && ['xls', 'xlsx'].includes(ext)) return <FileExcelOutlined style={{ fontSize: 18, color: '#52c41a' }} />
  if (ext && ['doc', 'docx'].includes(ext)) return <FileWordOutlined style={{ fontSize: 18, color: '#1890ff' }} />
  if (ext && ['txt', 'csv'].includes(ext)) return <FileTextOutlined style={{ fontSize: 18, color: '#666' }} />

  return <FileOutlined style={{ fontSize: 18, color: '#8c8c8c' }} />
}

export const InvoiceAttachmentsTab: React.FC<InvoiceAttachmentsTabProps> = ({
  attachments,
  loadingAttachments,
  onPreview,
  onDownload,
  onDelete,
  formatFileSize
}) => {
  const columns: ColumnsType<AttachmentData> = [
    {
      title: 'Название файла',
      dataIndex: 'original_name',
      key: 'original_name',
      sorter: (a, b) => a.original_name.localeCompare(b.original_name),
      ellipsis: true,
      render: (name: string, record: AttachmentData) => (
        <Space>
          {getFileIcon(record.mime_type, name)}
          <span style={{ fontWeight: 500 }}>{name}</span>
        </Space>
      )
    },
    {
      title: 'Источник',
      dataIndex: 'source_label',
      key: 'source_label',
      sorter: (a, b) => (a.source_label || '').localeCompare(b.source_label || ''),
      render: (label: string, record: any) => (
        <Tag color={record.source === 'invoice' ? 'blue' : 'green'}>
          {label}
        </Tag>
      )
    },
    {
      title: 'Размер',
      dataIndex: 'size_bytes',
      key: 'size_bytes',
      sorter: (a, b) => a.size_bytes - b.size_bytes,
      render: (size: number) => formatFileSize(size)
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: {
        showTitle: false,
      },
      render: (description: string) => (
        description ? (
          <Tooltip placement="topLeft" title={description}>
            <span>{description}</span>
          </Tooltip>
        ) : (
          <span style={{ color: '#bfbfbf' }}>—</span>
        )
      )
    },
    {
      title: 'Дата загрузки',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      defaultSortOrder: 'descend',
      render: (date: string) => new Date(date).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    {
      title: 'Действия',
      key: 'actions',
      fixed: 'right',
      render: (_: any, record: AttachmentData) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => onPreview(record)}
            size="small"
            title="Просмотр"
          />
          <Button
            icon={<DownloadOutlined />}
            onClick={() => onDownload(record)}
            size="small"
            title="Скачать"
          />
          <Button
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: 'Удалить файл?',
                content: `Вы уверены, что хотите удалить файл "${record.original_name}"?`,
                okText: 'Удалить',
                cancelText: 'Отмена',
                okButtonProps: { danger: true },
                onOk: () => onDelete(record)
              })
            }}
            size="small"
            danger
            title="Удалить"
          />
        </Space>
      )
    }
  ]

  return (
    <div>
      {loadingAttachments ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Загрузка файлов...</div>
      ) : attachments.length > 0 ? (
        <Table
          dataSource={attachments}
          rowKey="id"
          columns={columns}
          pagination={false}
          tableLayout="auto"
          scroll={{ x: 'max-content' }}
        />
      ) : (
        <Empty description="Нет прикрепленных файлов" />
      )}
    </div>
  )
}