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
  fileDescriptions?: { [uid: string]: string }
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
  onUpdateFileDescription,
  fileDescriptions = {}
}) => {
  const [editingDescriptions, setEditingDescriptions] = React.useState<Record<string, string>>({})
  const [newFileDescriptions, setNewFileDescriptions] = React.useState<Record<string, string>>({})

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
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />} loading={uploadingFile}>
            Загрузить файлы
          </Button>
        </Upload>
        {fileList.length > 0 && (
          <List
            size="small"
            dataSource={fileList}
            style={{ marginTop: '16px' }}
            renderItem={(file) => (
              <List.Item
                actions={[
                  <Button
                    key="preview"
                    type="link"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => onFilePreview(file)}
                  />,
                  <Button
                    key="delete"
                    type="link"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => onFileRemove(file)}
                  />
                ]}
              >
                <Space style={{ width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Space>
                    <FileOutlined />
                    <Space direction="vertical" size={0}>
                      <Text>{file.name}</Text>
                      {file.status === 'error' && <Text type="danger" style={{ fontSize: '12px' }}>(Ошибка загрузки)</Text>}
                    </Space>
                  </Space>
                  <Input
                    size="small"
                    placeholder="Введите сюда описание файла"
                    style={{ width: '300px' }}
                    value={newFileDescriptions[file.uid] || fileDescriptions[file.uid] || ''}
                    onChange={(e) => {
                      setNewFileDescriptions(prev => ({ ...prev, [file.uid]: e.target.value }))
                    }}
                    onBlur={(e) => {
                      if (onUpdateFileDescription && e.target.value !== fileDescriptions[file.uid]) {
                        onUpdateFileDescription(file.uid, e.target.value)
                      }
                    }}
                  />
                </Space>
              </List.Item>
            )}
          />
        )}
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
                <Space style={{ width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Space>
                    <FileOutlined />
                    <Text>{item.original_name}</Text>
                  </Space>
                  {editingDescriptions[item.id] !== undefined ? (
                    <Space.Compact>
                      <Input
                        size="small"
                        value={editingDescriptions[item.id]}
                        onChange={(e) => handleDescriptionEdit(item.id, e.target.value)}
                        placeholder="Введите сюда описание файла"
                        style={{ width: '300px' }}
                      />
                      <Button size="small" onClick={() => handleDescriptionSave(item.id)}>
                        Сохранить
                      </Button>
                    </Space.Compact>
                  ) : (
                    <Input
                      size="small"
                      placeholder="Введите сюда описание файла"
                      value={item.description || ''}
                      style={{ width: '300px' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDescriptionEdit(item.id, item.description || '')
                      }}
                      readOnly
                    />
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