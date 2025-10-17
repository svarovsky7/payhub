import React, { useState } from 'react'
import { Upload, Button, List, Typography, message } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import type { UploadFile, UploadProps, RcFile } from 'antd/es/upload'
import { supabase } from '../../lib/supabase'
import { FilePreviewModal } from './FilePreviewModal'
import { NewFileListItem, ExistingFileListItem } from './FileListItem'
import { getBase64, getFileType } from './FileUploadUtils'

const { Title } = Typography

// Интерфейс для существующих файлов
export interface ExistingFile {
  id: string
  original_name: string
  storage_path: string
  size_bytes: number
  mime_type: string
  description?: string
  created_at: string
  attachment_id?: string // ID связи в таблице связей (например, invoice_attachments)
}

// Интерфейс для описаний файлов
export interface FileDescriptions {
  [key: string]: string
}

interface FileUploadBlockProps {
  // Основные свойства
  entityType: 'invoice' | 'payment' | 'contract' | 'material_request' // Тип сущности
  entityId?: string // ID сущности (для режима редактирования)

  // Управление файлами
  fileList: UploadFile[] // Список новых файлов для загрузки
  onFileListChange: (files: UploadFile[]) => void // Обработчик изменения списка файлов
  existingFiles?: ExistingFile[] // Существующие загруженные файлы
  onExistingFilesChange?: () => Promise<void> // Обработчик изменения существующих файлов

  // Описания файлов
  fileDescriptions?: FileDescriptions // Описания для новых файлов
  onFileDescriptionChange?: (uid: string, description: string) => void // Изменение описания нового файла
  onExistingFileDescriptionChange?: (fileId: string, description: string) => void // Изменение описания существующего файла

  // Настройки
  multiple?: boolean // Множественная загрузка
  maxSize?: number // Максимальный размер файла в MB
  accept?: string // Допустимые типы файлов
  disabled?: boolean // Отключить компонент
  showUploadButton?: boolean // Показывать кнопку загрузки

  // Кастомные обработчики
  customUpload?: (file: RcFile) => Promise<void> // Кастомная загрузка
  onPreview?: (file: UploadFile | ExistingFile) => void // Кастомный просмотр
}

export const FileUploadBlock: React.FC<FileUploadBlockProps> = ({
  // entityType,
  // entityId,
  fileList,
  onFileListChange,
  existingFiles = [],
  onExistingFilesChange,
  fileDescriptions = {},
  onFileDescriptionChange,
  onExistingFileDescriptionChange,
  multiple = true,
  maxSize = 10,
  accept,
  disabled = false,
  showUploadButton = true,
  customUpload,
  onPreview
}) => {
  const [uploadingFile, setUploadingFile] = useState(false)
  const [previewModal, setPreviewModal] = useState<{
    open: boolean
    title: string
    url: string
    type: 'image' | 'pdf' | 'other'
  }>({
    open: false,
    title: '',
    url: '',
    type: 'other'
  })

  // Обработка загрузки файла
  const beforeUpload = (file: RcFile) => {
    const isLt = file.size / 1024 / 1024 < maxSize
    if (!isLt) {
      message.error(`Файл должен быть меньше ${maxSize}MB!`)
      return false
    }

    // Если есть кастомная загрузка, используем её
    if (customUpload) {
      setUploadingFile(true)
      customUpload(file)
        .then(() => setUploadingFile(false))
        .catch((error) => {
          console.error('[FileUploadBlock] Custom upload error:', error)
          message.error('Ошибка загрузки файла')
          setUploadingFile(false)
        })
      return false
    }

    // Иначе добавляем в список для ручной загрузки позже
    return false
  }

  // Обработчик изменения списка файлов
  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    onFileListChange(newFileList)
  }

  // Удаление нового файла
  const handleRemove: UploadProps['onRemove'] = (file) => {
    const newFileList = fileList.filter(f => f.uid !== file.uid)
    onFileListChange(newFileList)
    return true
  }

  // Просмотр файла
  const handlePreviewFile = async (file: UploadFile | ExistingFile) => {
    // Если есть кастомный обработчик просмотра
    if (onPreview) {
      onPreview(file)
      return
    }

    try {
      let fileName: string
      let fileUrl: string
      let fileType: 'image' | 'pdf' | 'other'

      // Определяем, новый это файл или существующий
      if ('originFileObj' in file) {
        // Новый файл
        fileName = file.name
        fileType = getFileType(fileName)

        if (file.originFileObj) {
          fileUrl = await getBase64(file.originFileObj as RcFile)
        } else if (file.url) {
          fileUrl = file.url
        } else {
          message.error('Не удалось получить файл для просмотра')
          return
        }
      } else {
        // Существующий файл
        fileName = (file as ExistingFile).original_name
        fileType = getFileType(fileName)

        // Загружаем файл из storage
        const { data, error } = await supabase.storage
          .from('attachments')
          .download((file as ExistingFile).storage_path)

        if (error) throw error

        fileUrl = URL.createObjectURL(data)
      }

      // Открываем модальное окно просмотра
      setPreviewModal({
        open: true,
        title: fileName,
        url: fileUrl,
        type: fileType
      })
    } catch (error) {
      console.error('[FileUploadBlock] Preview error:', error)
      message.error('Ошибка при просмотре файла')
    }
  }

  // Закрытие модального окна просмотра
  const handleClosePreview = () => {
    // Очищаем URL если это blob
    if (previewModal.url.startsWith('blob:')) {
      URL.revokeObjectURL(previewModal.url)
    }
    setPreviewModal({
      open: false,
      title: '',
      url: '',
      type: 'other'
    })
  }

  // Скачивание файла
  const handleDownloadFile = async (file: ExistingFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('attachments')
        .download(file.storage_path)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = file.original_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      message.success('Файл успешно скачан')
    } catch (error) {
      console.error('[FileUploadBlock] Download error:', error)
      message.error('Ошибка скачивания файла')
    }
  }

  // Удаление существующего файла
  const handleDeleteExistingFile = async (file: ExistingFile) => {
    try {
      // Удаляем файл из storage
      const { error: storageError } = await supabase.storage
        .from('attachments')
        .remove([file.storage_path])

      if (storageError) {
        console.error('[FileUploadBlock] Storage delete error:', storageError)
      }

      // Удаляем запись из таблицы attachments
      const { error: dbError } = await supabase
        .from('attachments')
        .delete()
        .eq('id', file.id)

      if (dbError) throw dbError

      message.success('Файл успешно удален')

      // Обновляем список файлов
      if (onExistingFilesChange) {
        await onExistingFilesChange()
      }
    } catch (error) {
      console.error('[FileUploadBlock] Delete error:', error)
      message.error('Ошибка удаления файла')
    }
  }


  return (
    <div className="file-upload-block">
      {/* Кнопка загрузки новых файлов */}
      {showUploadButton && !disabled && (
        <Upload
          fileList={fileList}
          onChange={handleChange}
          onRemove={handleRemove}
          beforeUpload={beforeUpload}
          multiple={multiple}
          accept={accept}
          showUploadList={false}
          disabled={disabled || uploadingFile}
        >
          <Button
            icon={<UploadOutlined />}
            loading={uploadingFile}
            disabled={disabled}
          >
            {multiple ? 'Загрузить файлы' : 'Загрузить файл'}
          </Button>
        </Upload>
      )}

      {/* Список новых файлов для загрузки */}
      {fileList.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Title level={5}>Новые файлы</Title>
          <List
            size="small"
            dataSource={fileList}
            renderItem={(file) => (
              <NewFileListItem
                file={file}
                description={fileDescriptions[file.uid]}
                disabled={disabled}
                onPreview={handlePreviewFile}
                onRemove={handleRemove}
                onDescriptionChange={onFileDescriptionChange}
              />
            )}
          />
        </div>
      )}

      {/* Список существующих файлов */}
      {existingFiles.length > 0 && (
        <div style={{ marginTop: fileList.length > 0 ? 24 : 16 }}>
          <Title level={5}>Загруженные файлы</Title>
          <List
            size="small"
            dataSource={existingFiles}
            renderItem={(file) => (
              <ExistingFileListItem
                file={file}
                disabled={disabled}
                onPreview={handlePreviewFile}
                onDownload={handleDownloadFile}
                onDelete={handleDeleteExistingFile}
                onDescriptionChange={onExistingFileDescriptionChange}
              />
            )}
          />
        </div>
      )}

      {/* Модальное окно просмотра */}
      <FilePreviewModal
        open={previewModal.open}
        title={previewModal.title}
        url={previewModal.url}
        type={previewModal.type}
        onClose={handleClosePreview}
      />
    </div>
  )
}