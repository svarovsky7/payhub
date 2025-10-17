import React from 'react'
import { List, Button, Input, Typography, Tooltip, Popconfirm } from 'antd'
import { EyeOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons'
import { getFileIcon } from './FilePreviewModal'
import dayjs from 'dayjs'
import type { UploadFile } from 'antd/es/upload'
import type { ExistingFile } from './FileUploadBlock'

const { Text } = Typography

interface NewFileListItemProps {
  file: UploadFile
  description?: string
  disabled?: boolean
  onPreview: (file: UploadFile) => void
  onRemove: (file: UploadFile) => void
  onDescriptionChange?: (uid: string, description: string) => void
}

export const NewFileListItem: React.FC<NewFileListItemProps> = ({
  file,
  description,
  disabled,
  onPreview,
  onRemove,
  onDescriptionChange
}) => {
  return (
    <List.Item
      actions={[
        <Tooltip title="Просмотреть" key="preview">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onPreview(file)}
            disabled={disabled}
          />
        </Tooltip>,
        <Tooltip title="Удалить" key="delete">
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => onRemove(file)}
            disabled={disabled}
          />
        </Tooltip>
      ]}
    >
      <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: 18 }}>{getFileIcon(file.name)}</span>
        <div style={{ flex: 1 }}>
          <div>{file.name}</div>
          {file.status === 'error' && (
            <Text type="danger" style={{ fontSize: 12 }}>Ошибка загрузки</Text>
          )}
        </div>
        <Input
          size="small"
          placeholder="Описание файла"
          style={{ width: 300, textAlign: 'right' }}
          value={description || ''}
          onChange={(e) => {
            if (onDescriptionChange) {
              onDescriptionChange(file.uid, e.target.value)
            }
          }}
          disabled={disabled}
        />
      </div>
    </List.Item>
  )
}

interface ExistingFileListItemProps {
  file: ExistingFile
  disabled?: boolean
  onPreview: (file: ExistingFile) => void
  onDownload: (file: ExistingFile) => void
  onDelete: (file: ExistingFile) => void
  onDescriptionChange?: (fileId: string, description: string) => void
}

export const ExistingFileListItem: React.FC<ExistingFileListItemProps> = ({
  file,
  disabled,
  onPreview,
  onDownload,
  onDelete,
  onDescriptionChange
}) => {

  return (
    <List.Item
      actions={[
        <Tooltip title="Просмотреть" key="preview">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onPreview(file)}
          />
        </Tooltip>,
        <Tooltip title="Скачать" key="download">
          <Button
            type="text"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => onDownload(file)}
          />
        </Tooltip>,
        !disabled && (
          <Popconfirm
            key="delete"
            title="Удалить файл?"
            description="Файл будет удален безвозвратно"
            onConfirm={() => onDelete(file)}
            okText="Удалить"
            cancelText="Отмена"
          >
            <Tooltip title="Удалить">
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        )
      ].filter(Boolean)}
    >
      <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: 18 }}>{getFileIcon(file.original_name)}</span>
        <div style={{ flex: 1 }}>
          <div>{file.original_name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {(file.size_bytes / 1024).toFixed(1)} KB •
            {dayjs(file.created_at).format('DD.MM.YYYY HH:mm')}
          </Text>
        </div>
        <Input
          size="small"
          placeholder="Описание файла"
          style={{ width: 300, textAlign: 'right' }}
          value={file.description || ''}
          onChange={(e) => {
            if (onDescriptionChange) {
              onDescriptionChange(file.id, e.target.value)
            }
          }}
          disabled={disabled}
        />
      </div>
    </List.Item>
  )
}