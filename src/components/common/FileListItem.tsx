import React, { useState } from 'react'
import { List, Button, Input, Space, Typography, Tooltip, Popconfirm } from 'antd'
import { EyeOutlined, DeleteOutlined, DownloadOutlined, EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons'
import { supabase } from '../../lib/supabase'
import { getFileIcon } from './FilePreviewModal'
import dayjs from 'dayjs'
import { message } from 'antd'
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
  onUpdate?: () => Promise<void>
}

export const ExistingFileListItem: React.FC<ExistingFileListItemProps> = ({
  file,
  disabled,
  onPreview,
  onDownload,
  onDelete,
  onUpdate
}) => {
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editingDescription, setEditingDescription] = useState(file.description || '')

  const handleSaveDescription = async () => {
    try {
      const { error } = await supabase
        .from('attachments')
        .update({ description: editingDescription })
        .eq('id', file.id)

      if (error) throw error

      message.success('Описание сохранено')
      setIsEditingDescription(false)

      if (onUpdate) {
        await onUpdate()
      }
    } catch (error) {
      console.error('[ExistingFileListItem] Save description error:', error)
      message.error('Ошибка сохранения описания')
    }
  }

  const handleCancelEdit = () => {
    setEditingDescription(file.description || '')
    setIsEditingDescription(false)
  }

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
        {isEditingDescription ? (
          <Space.Compact>
            <Input
              size="small"
              value={editingDescription}
              onChange={(e) => setEditingDescription(e.target.value)}
              placeholder="Описание файла"
              style={{ width: 250, textAlign: 'right' }}
            />
            <Button
              size="small"
              icon={<SaveOutlined />}
              onClick={handleSaveDescription}
            />
            <Button
              size="small"
              icon={<CloseOutlined />}
              onClick={handleCancelEdit}
            />
          </Space.Compact>
        ) : (
          <div
            style={{
              width: 300,
              cursor: disabled ? 'default' : 'pointer',
              padding: '4px 8px',
              border: '1px solid transparent',
              borderRadius: '4px',
              transition: 'all 0.2s',
              textAlign: 'right'
            }}
            onClick={() => {
              if (!disabled) {
                setIsEditingDescription(true)
              }
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.border = '1px solid #d9d9d9'
                e.currentTarget.style.background = '#fafafa'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.border = '1px solid transparent'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            {file.description ? (
              <Text>{file.description}</Text>
            ) : (
              <Text type="secondary">
                {disabled ? 'Нет описания' : 'Нажмите для добавления описания'}
              </Text>
            )}
            {!disabled && (
              <EditOutlined style={{ marginLeft: 8, fontSize: 12, opacity: 0.5 }} />
            )}
          </div>
        )}
      </div>
    </List.Item>
  )
}