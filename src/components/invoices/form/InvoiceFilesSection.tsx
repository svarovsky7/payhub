import { Form, Upload, Button, Table, Space, Input } from 'antd'
import { UploadOutlined, EyeOutlined, DeleteOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd/es/upload/interface'

interface InvoiceFilesSectionProps {
  fileList: UploadFile[]
  loadingFiles: boolean
  fileDescriptions: { [key: string]: string }
  onFileDescriptionChange: (uid: string, description: string) => void
  uploadProps: UploadProps
  handlePreview: (file: UploadFile) => void
}

export const InvoiceFilesSection: React.FC<InvoiceFilesSectionProps> = ({
  fileList,
  loadingFiles,
  fileDescriptions,
  onFileDescriptionChange,
  uploadProps,
  handlePreview
}) => {
  return (
    <Form.Item label="Прикреплённые файлы">
      <Upload {...uploadProps}>
        <Button icon={<UploadOutlined />}>Выбрать файлы</Button>
      </Upload>
      {(fileList.length > 0 || loadingFiles) && (
        <Table
          style={{ marginTop: 16 }}
          loading={loadingFiles}
          dataSource={fileList}
          rowKey="uid"
          pagination={false}
          size="small"
          columns={[
            {
              title: 'Файл',
              dataIndex: 'name',
              key: 'name',
              width: '40%',
              render: (name: string) => (
                <Space size="small">
                  <EyeOutlined
                    style={{ color: '#1890ff', cursor: 'pointer' }}
                    onClick={() => {
                      const file = fileList.find(f => f.name === name)
                      if (file) {
                        handlePreview(file)
                      }
                    }}
                    title="Просмотр"
                  />
                  <DeleteOutlined
                    style={{ color: '#ff4d4f', cursor: 'pointer' }}
                    onClick={() => {
                      const file = fileList.find(f => f.name === name)
                      if (file) {
                        uploadProps.onRemove?.(file)
                      }
                    }}
                    title="Удалить"
                  />
                  <span>{name}</span>
                </Space>
              )
            },
            {
              title: 'Размер',
              dataIndex: 'size',
              key: 'size',
              width: '15%',
              render: (size: number) => {
                if (!size) return '-'
                if (size < 1024) return `${size} B`
                if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
                return `${(size / (1024 * 1024)).toFixed(1)} MB`
              }
            },
            {
              title: 'Описание',
              key: 'description',
              width: '45%',
              render: (_, file: UploadFile) => (
                <Input
                  placeholder="Добавьте описание файла"
                  value={fileDescriptions[file.uid] || ''}
                  onChange={(e) => onFileDescriptionChange(file.uid, e.target.value)}
                  size="small"
                />
              )
            }
          ]}
        />
      )}
    </Form.Item>
  )
}