import { Table, Button, Space, Tag, Empty, Modal } from 'antd'
import { FileOutlined, DownloadOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons'

interface AttachmentData {
  id: string
  original_name: string
  storage_path: string
  size_bytes: number
  mime_type: string
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

export const InvoiceAttachmentsTab: React.FC<InvoiceAttachmentsTabProps> = ({
  attachments,
  loadingAttachments,
  onPreview,
  onDownload,
  onDelete,
  formatFileSize
}) => {
  const columns = [
    {
      title: 'Название файла',
      dataIndex: 'original_name',
      key: 'original_name',
      render: (name: string) => (
        <Space>
          <FileOutlined />
          {name}
        </Space>
      )
    },
    {
      title: 'Источник',
      dataIndex: 'source_label',
      key: 'source_label',
      width: 150,
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
      width: 120,
      render: (size: number) => formatFileSize(size)
    },
    {
      title: 'Тип файла',
      dataIndex: 'mime_type',
      key: 'mime_type',
      width: 150
    },
    {
      title: 'Дата загрузки',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('ru-RU')
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 180,
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
        />
      ) : (
        <Empty description="Нет прикрепленных файлов" />
      )}
    </div>
  )
}