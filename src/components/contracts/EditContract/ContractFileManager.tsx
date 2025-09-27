import React, { useState } from 'react'
import { Space, Button, Typography, Tooltip, Popconfirm, Modal, message, Image } from 'antd'
import {
  EyeOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  DownloadOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { supabase } from '../../../lib/supabase'

const { Text } = Typography

interface ContractFileManagerProps {
  existingFiles: any[]
  loadingFiles: boolean
  onFilesChange: () => void
}

export const ContractFileManager: React.FC<ContractFileManagerProps> = ({
  existingFiles,
  loadingFiles,
  onFilesChange
}) => {
  const [previewImage, setPreviewImage] = useState<string>('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTitle, setPreviewTitle] = useState<string>('')
  const [previewType, setPreviewType] = useState<'image' | 'pdf'>('image')

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext || '')) {
      return <FileImageOutlined />
    }
    if (ext === 'pdf') {
      return <FilePdfOutlined />
    }
    if (['doc', 'docx'].includes(ext || '')) {
      return <FileWordOutlined />
    }
    if (['xls', 'xlsx'].includes(ext || '')) {
      return <FileExcelOutlined />
    }
    return <FileTextOutlined />
  }

  const handlePreviewExistingFile = async (file: any) => {
    try {
      const fileName = file.attachments?.original_name || ''
      const storagePath = file.attachments?.storage_path

      console.log('[ContractFileManager.handlePreviewExistingFile] Previewing file:', {
        fileName,
        storagePath,
        fileData: file
      })

      if (!storagePath) {
        message.error('Путь к файлу не найден')
        return
      }

      const ext = fileName.split('.').pop()?.toLowerCase()
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext || '')
      const isPdf = ext === 'pdf'

      if (isImage || isPdf) {
        console.log('[ContractFileManager.handlePreviewExistingFile] Downloading file for preview')

        const { data, error } = await supabase.storage
          .from('attachments')
          .download(storagePath)

        if (error) {
          console.error('[ContractFileManager.handlePreviewExistingFile] Download error:', error)
          throw error
        }

        const url = URL.createObjectURL(data)

        if (isImage) {
          console.log('[ContractFileManager.handlePreviewExistingFile] Showing image preview')
          setPreviewImage(url)
          setPreviewTitle(fileName)
          setPreviewType('image')
          setPreviewOpen(true)

          setTimeout(() => {
            if (!previewOpen) {
              URL.revokeObjectURL(url)
            }
          }, 5000)
        } else if (isPdf) {
          console.log('[ContractFileManager.handlePreviewExistingFile] Showing PDF preview')
          setPreviewImage(url)
          setPreviewTitle(fileName)
          setPreviewType('pdf')
          setPreviewOpen(true)
        }
      } else {
        console.log('[ContractFileManager.handlePreviewExistingFile] Showing file info')
        Modal.info({
          title: 'Информация о файле',
          content: (
            <div>
              <p><strong>Название:</strong> {fileName}</p>
              <p><strong>Размер:</strong> {file.attachments?.size_bytes
                ? `${(file.attachments.size_bytes / 1024).toFixed(1)} KB`
                : 'Неизвестно'}</p>
              <p><strong>Тип:</strong> {file.attachments?.mime_type || 'Неизвестно'}</p>
              <p><strong>Создан:</strong> {file.attachments?.created_at
                ? dayjs(file.attachments.created_at).format('DD.MM.YYYY HH:mm')
                : 'Неизвестно'}</p>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadFile(file)}
                style={{ marginTop: 16 }}
              >
                Скачать файл
              </Button>
            </div>
          ),
          okText: 'Закрыть'
        })
      }
    } catch (error) {
      console.error('[ContractFileManager.handlePreviewExistingFile] Error:', error)
      message.error('Ошибка при просмотре файла')
    }
  }

  const handleDownloadFile = async (file: any) => {
    try {
      const fileName = file.attachments?.original_name || 'file'
      const storagePath = file.attachments?.storage_path

      console.log('[ContractFileManager.handleDownloadFile] Downloading file:', {
        fileName,
        storagePath
      })

      if (!storagePath) {
        message.error('Путь к файлу не найден')
        return
      }

      const { data, error } = await supabase.storage
        .from('attachments')
        .download(storagePath)

      if (error) {
        console.error('[ContractFileManager.handleDownloadFile] Download error:', error)
        throw error
      }

      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      message.success('Файл успешно скачан')
    } catch (error) {
      console.error('[ContractFileManager.handleDownloadFile] Error:', error)
      message.error('Ошибка скачивания файла')
    }
  }

  const handleDeleteFile = async (file: any) => {
    try {
      const { error: storageError } = await supabase.storage
        .from('attachments')
        .remove([file.attachments.storage_path])

      if (storageError) {
        console.error('[ContractFileManager.handleDeleteFile] Storage error:', storageError)
      }

      const { error: attachmentError } = await supabase
        .from('attachments')
        .delete()
        .eq('id', file.attachment_id)

      if (attachmentError) throw attachmentError

      message.success('Файл успешно удален')
      onFilesChange()
    } catch (error) {
      console.error('[ContractFileManager.handleDeleteFile] Error:', error)
      message.error('Ошибка удаления файла')
    }
  }

  if (loadingFiles) {
    return <Text>Загрузка файлов...</Text>
  }

  if (existingFiles.length === 0) {
    return <Text type="secondary">Нет загруженных файлов</Text>
  }

  return (
    <>
      <Space direction="vertical" style={{ width: '100%' }}>
        {existingFiles.map((file) => (
          <div
            key={file.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: '4px'
            }}
          >
            <Space>
              <span style={{ fontSize: 20 }}>
                {getFileIcon(file.attachments?.original_name || '')}
              </span>
              <Text>{file.attachments?.original_name}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {file.attachments?.size_bytes
                  ? `${(file.attachments.size_bytes / 1024).toFixed(1)} KB`
                  : ''}
              </Text>
            </Space>
            <Space>
              <Tooltip title="Просмотреть">
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => handlePreviewExistingFile(file)}
                />
              </Tooltip>
              <Tooltip title="Скачать">
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => handleDownloadFile(file)}
                />
              </Tooltip>
              <Popconfirm
                title="Удалить файл?"
                onConfirm={() => handleDeleteFile(file)}
                okText="Удалить"
                cancelText="Отмена"
              >
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            </Space>
          </div>
        ))}
      </Space>

      <FilePreviewModal
        open={previewOpen}
        title={previewTitle}
        imageUrl={previewImage}
        previewType={previewType}
        onClose={() => {
          setPreviewOpen(false)
          if (previewImage) {
            URL.revokeObjectURL(previewImage)
          }
          setPreviewImage('')
          setPreviewTitle('')
          setPreviewType('image')
        }}
      />
    </>
  )
}

interface FilePreviewModalProps {
  open: boolean
  title: string
  imageUrl: string
  previewType: 'image' | 'pdf'
  onClose: () => void
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  open,
  title,
  imageUrl,
  previewType,
  onClose
}) => {
  return (
    <Modal
      open={open}
      title={`Просмотр: ${title}`}
      footer={
        previewType === 'pdf' ? (
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => {
                const link = document.createElement('a')
                link.href = imageUrl
                link.download = title
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }}
            >
              Скачать PDF
            </Button>
            <Button onClick={onClose}>
              Закрыть
            </Button>
          </Space>
        ) : null
      }
      onCancel={onClose}
      width={previewType === 'pdf' ? 1000 : 800}
      style={{ top: 20 }}
      styles={{
        body: previewType === 'pdf' ? { padding: 0, height: '75vh' } : undefined
      }}
    >
      {previewType === 'image' ? (
        <div style={{ textAlign: 'center' }}>
          <Image
            alt="preview"
            style={{ maxWidth: '100%', maxHeight: '70vh' }}
            src={imageUrl}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRklEQVR42u3SMQ0AAAzDsJU/6yGFfyFpIJHQK7mlL0kgCQIBgUBAICAQCAgEAgKBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEDAJhYAAADnbvnLfwAAAABJRU5ErkJggg=="
          />
        </div>
      ) : previewType === 'pdf' ? (
        <div style={{ height: '100%', width: '100%' }}>
          <embed
            src={imageUrl}
            type="application/pdf"
            width="100%"
            height="100%"
            style={{ border: 'none' }}
          />
          <div style={{
            position: 'absolute',
            bottom: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(255,255,255,0.9)',
            padding: '5px 10px',
            borderRadius: '4px'
          }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Если PDF не отображается, используйте кнопку "Скачать PDF"
            </Text>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}