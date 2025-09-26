import React from 'react'
import { Form, Upload, Button, Typography, List, Space, Input } from 'antd'
import { UploadOutlined, FileOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'

const { Text } = Typography
const { TextArea } = Input

interface InvoiceFileUploadProps {
  fileList: UploadFile[]
  onFileChange: UploadProps['onChange']
  onFileRemove: UploadProps['onRemove']
  onFilePreview: UploadProps['onPreview']
  customRequest: UploadProps['customRequest']
  uploadingFile: boolean
  existingAttachments?: any[]
  onDeleteExistingFile?: (fileId: string, filePath: string) => void
  onUpdateFileDescription?: (fileId: string, description: string) => void
}

export const InvoiceFileUpload: React.FC<InvoiceFileUploadProps> = ({
  fileList,
  onFileChange,
  onFileRemove,
  onFilePreview,
  customRequest,
  uploadingFile,
  existingAttachments = [],
  onDeleteExistingFile,
  onUpdateFileDescription
}) => {
  const [editingDescriptions, setEditingDescriptions] = React.useState<Record<string, string>>({})

  const handleDescriptionEdit = (fileId: string, description: string) => {
    setEditingDescriptions(prev => ({ ...prev, [fileId]: description }))
  }

  const handleDescriptionSave = (fileId: string) => {
    if (onUpdateFileDescription && editingDescriptions[fileId] !== undefined) {
      onUpdateFileDescription(fileId, editingDescriptions[fileId])
      setEditingDescriptions(prev => {
        const newState = { ...prev }
        delete newState[fileId]
        return newState
      })
    }
  }

  return (
    <>
      <Form.Item label="Файлы счета">
        <Upload
          fileList={fileList}
          onChange={onFileChange}
          onRemove={onFileRemove}
          onPreview={onFilePreview}
          customRequest={customRequest}
          multiple
          showUploadList={{
            showPreviewIcon: true,
            showRemoveIcon: true,
            showDownloadIcon: false
          }}
        >
          <Button icon={<UploadOutlined />} loading={uploadingFile}>
            Загрузить файлы
          </Button>
        </Upload>
      </Form.Item>

      {existingAttachments.length > 0 && (
        <Form.Item label="Загруженные файлы">
          <List
            size="small"
            dataSource={existingAttachments}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    key="download"
                    type="link"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => onFilePreview?.({ uid: item.id, name: item.original_name } as any)}
                  />,
                  onDeleteExistingFile && (
                    <Button
                      key="delete"
                      type="link"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => onDeleteExistingFile(item.id, item.storage_path)}
                    />
                  )
                ].filter(Boolean)}
              >
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space>
                    <FileOutlined />
                    <Text>{item.original_name}</Text>
                  </Space>
                  {editingDescriptions[item.id] !== undefined ? (
                    <Space.Compact style={{ width: '100%' }}>
                      <Input
                        size="small"
                        value={editingDescriptions[item.id]}
                        onChange={(e) => handleDescriptionEdit(item.id, e.target.value)}
                        placeholder="Описание файла"
                      />
                      <Button size="small" onClick={() => handleDescriptionSave(item.id)}>
                        Сохранить
                      </Button>
                    </Space.Compact>
                  ) : (
                    <Text
                      type="secondary"
                      style={{ fontSize: '12px', cursor: 'pointer' }}
                      onClick={() => handleDescriptionEdit(item.id, item.description || '')}
                    >
                      {item.description || 'Нажмите для добавления описания'}
                    </Text>
                  )}
                </Space>
              </List.Item>
            )}
          />
        </Form.Item>
      )}
    </>
  )
}