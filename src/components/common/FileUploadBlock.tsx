import React, { useState } from 'react'
import {
  Upload,
  Button,
  List,
  Space,
  Input,
  Modal,
  Image,
  Typography,
  Tooltip,
  Popconfirm,
  message,
} from 'antd'
import {
  UploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileExcelOutlined,
  FileWordOutlined
} from '@ant-design/icons'
import type { UploadFile, UploadProps, RcFile } from 'antd/es/upload'
import { supabase } from '../../lib/supabase'
import dayjs from 'dayjs'

const { Text, Title } = Typography

// Типы файлов для определения иконки
const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext || '')) {
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
  multiple = true,
  maxSize = 10,
  accept,
  disabled = false,
  showUploadButton = true,
  customUpload,
  onPreview
}) => {
  const [uploadingFile, setUploadingFile] = useState(false)
  const [editingDescriptions, setEditingDescriptions] = useState<Record<string, string>>({})
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
      let fileType: 'image' | 'pdf' | 'other' = 'other'

      // Определяем, новый это файл или существующий
      if ('originFileObj' in file) {
        // Новый файл
        fileName = file.name
        const ext = fileName.split('.').pop()?.toLowerCase()

        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext || '')) {
          fileType = 'image'
        } else if (ext === 'pdf') {
          fileType = 'pdf'
        }

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
        const ext = fileName.split('.').pop()?.toLowerCase()

        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext || '')) {
          fileType = 'image'
        } else if (ext === 'pdf') {
          fileType = 'pdf'
        }

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

  // Сохранение описания существующего файла
  const handleSaveDescription = async (fileId: string) => {
    try {
      const description = editingDescriptions[fileId]

      const { error } = await supabase
        .from('attachments')
        .update({ description })
        .eq('id', fileId)

      if (error) throw error

      message.success('Описание сохранено')

      // Убираем из режима редактирования
      setEditingDescriptions(prev => {
        const newState = { ...prev }
        delete newState[fileId]
        return newState
      })

      // Обновляем список файлов
      if (onExistingFilesChange) {
        await onExistingFilesChange()
      }
    } catch (error) {
      console.error('[FileUploadBlock] Save description error:', error)
      message.error('Ошибка сохранения описания')
    }
  }

  // Вспомогательная функция для получения base64
  const getBase64 = (file: RcFile): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })

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
              <List.Item
                actions={[
                  <Tooltip title="Просмотреть" key="preview">
                    <Button
                      type="text"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => handlePreviewFile(file)}
                      disabled={disabled}
                    />
                  </Tooltip>,
                  <Tooltip title="Удалить" key="delete">
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemove(file)}
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
                    value={fileDescriptions[file.uid] || ''}
                    onChange={(e) => {
                      if (onFileDescriptionChange) {
                        onFileDescriptionChange(file.uid, e.target.value)
                      }
                    }}
                    disabled={disabled}
                  />
                </div>
              </List.Item>
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
            renderItem={(file) => {
              const isEditingDescription = editingDescriptions[file.id] !== undefined

              return (
                <List.Item
                  actions={[
                    <Tooltip title="Просмотреть" key="preview">
                      <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handlePreviewFile(file)}
                      />
                    </Tooltip>,
                    <Tooltip title="Скачать" key="download">
                      <Button
                        type="text"
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownloadFile(file)}
                      />
                    </Tooltip>,
                    !disabled && (
                      <Popconfirm
                        key="delete"
                        title="Удалить файл?"
                        description="Файл будет удален безвозвратно"
                        onConfirm={() => handleDeleteExistingFile(file)}
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
                          value={editingDescriptions[file.id]}
                          onChange={(e) => setEditingDescriptions(prev => ({
                            ...prev,
                            [file.id]: e.target.value
                          }))}
                          placeholder="Описание файла"
                          style={{ width: 250, textAlign: 'right' }}
                        />
                        <Button
                          size="small"
                          icon={<SaveOutlined />}
                          onClick={() => handleSaveDescription(file.id)}
                        />
                        <Button
                          size="small"
                          icon={<CloseOutlined />}
                          onClick={() => setEditingDescriptions(prev => {
                            const newState = { ...prev }
                            delete newState[file.id]
                            return newState
                          })}
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
                            setEditingDescriptions(prev => ({
                              ...prev,
                              [file.id]: file.description || ''
                            }))
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
            }}
          />
        </div>
      )}

      {/* Модальное окно просмотра */}
      <Modal
        open={previewModal.open}
        title={`Просмотр: ${previewModal.title}`}
        footer={
          previewModal.type === 'pdf' ? (
            <Space>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = previewModal.url
                  link.download = previewModal.title
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
              >
                Скачать PDF
              </Button>
              <Button onClick={handleClosePreview}>
                Закрыть
              </Button>
            </Space>
          ) : (
            <Button onClick={handleClosePreview}>
              Закрыть
            </Button>
          )
        }
        onCancel={handleClosePreview}
        width={previewModal.type === 'pdf' ? 1000 : 800}
        style={{ top: 20 }}
        styles={{
          body: previewModal.type === 'pdf' ? {
            padding: 0,
            height: '75vh',
            overflow: 'hidden'
          } : undefined
        }}
      >
        {previewModal.type === 'image' ? (
          <div style={{ textAlign: 'center' }}>
            <Image
              alt="preview"
              style={{ maxWidth: '100%', maxHeight: '70vh' }}
              src={previewModal.url}
              fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRklEQVR42u3SMQ0AAAzDsJU/6yGFfyFpIJHQK7mlL0kgCQIBgUBAICAQCAgEAgKBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEAgIBAICAQCAgGBgEDAJhYAAADnbvnLfwAAAABJRU5ErkJggg=="
            />
          </div>
        ) : previewModal.type === 'pdf' ? (
          <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            <embed
              src={previewModal.url}
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
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Если PDF не отображается, используйте кнопку "Скачать PDF"
              </Text>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: 64, color: '#bfbfbf', marginBottom: 16 }}>
              {getFileIcon(previewModal.title)}
            </div>
            <Title level={4}>{previewModal.title}</Title>
            <Text type="secondary">
              Предварительный просмотр недоступен для этого типа файла
            </Text>
            <div style={{ marginTop: 24 }}>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = previewModal.url
                  link.download = previewModal.title
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
              >
                Скачать файл
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}