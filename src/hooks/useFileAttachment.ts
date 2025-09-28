import { useState, useCallback, useEffect } from 'react'
import { message } from 'antd'
import type { UploadFile, RcFile } from 'antd/es/upload'
import type { ExistingFile, FileDescriptions } from '../components/common/FileUploadBlock'
import {
  uploadAndLinkFile,
  loadEntityFiles,
  deleteFile,
  updateFileDescription,
  type EntityType
} from '../services/fileAttachmentService'
import { useAuth } from '../contexts/AuthContext'

interface UseFileAttachmentOptions {
  entityType: EntityType
  entityId?: string
  autoLoad?: boolean
}

export const useFileAttachment = ({
  entityType,
  entityId,
  autoLoad = true
}: UseFileAttachmentOptions) => {
  const { user } = useAuth()
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [existingFiles, setExistingFiles] = useState<ExistingFile[]>([])
  const [fileDescriptions, setFileDescriptions] = useState<FileDescriptions>({})
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Загрузка существующих файлов
  const loadFiles = useCallback(async () => {
    if (!entityId) return

    setLoading(true)
    try {
      const files = await loadEntityFiles(entityType, entityId)
      setExistingFiles(files)
    } catch (error) {
      console.error('[useFileAttachment.loadFiles] Error:', error)
      message.error('Ошибка загрузки файлов')
    } finally {
      setLoading(false)
    }
  }, [entityType, entityId])

  // Автоматическая загрузка при монтировании и изменении entityId
  useEffect(() => {
    if (autoLoad && entityId) {
      loadFiles()
    }
  }, [entityId, autoLoad, loadFiles])

  // Обработчик изменения списка файлов для загрузки
  const handleFileListChange = useCallback((newFileList: UploadFile[]) => {
    setFileList(newFileList)
  }, [])

  // Обработчик изменения описания файла
  const handleFileDescriptionChange = useCallback((uid: string, description: string) => {
    setFileDescriptions(prev => ({
      ...prev,
      [uid]: description
    }))
  }, [])

  // Загрузка нового файла на сервер
  const uploadFile = useCallback(async (file: RcFile): Promise<void> => {
    if (!entityId || !user) {
      message.error('Невозможно загрузить файл: не указана сущность или пользователь')
      return
    }

    setUploading(true)
    try {
      // Получаем описание файла если есть
      const tempUid = `temp_${Date.now()}_${Math.random()}`
      const description = fileDescriptions[tempUid] || undefined

      await uploadAndLinkFile({
        file,
        entityType,
        entityId,
        description,
        userId: user.id
      })

      message.success(`Файл ${file.name} успешно загружен`)

      // Перезагружаем список файлов
      await loadFiles()

      // Очищаем временный список
      setFileList(prev => prev.filter(f => f.uid !== tempUid))
      setFileDescriptions(prev => {
        const newDescriptions = { ...prev }
        delete newDescriptions[tempUid]
        return newDescriptions
      })
    } catch (error) {
      console.error('[useFileAttachment.uploadFile] Error:', error)
      message.error(`Ошибка загрузки файла ${file.name}`)
    } finally {
      setUploading(false)
    }
  }, [entityId, entityType, user, fileDescriptions, loadFiles])

  // Загрузка всех файлов из списка
  const uploadAllFiles = useCallback(async (): Promise<void> => {
    if (!entityId || !user) {
      message.error('Невозможно загрузить файлы: не указана сущность или пользователь')
      return
    }

    if (fileList.length === 0) {
      message.info('Нет файлов для загрузки')
      return
    }

    setUploading(true)
    let uploadedCount = 0
    let errorCount = 0

    try {
      for (const file of fileList) {
        if (!file.originFileObj) continue

        try {
          const description = fileDescriptions[file.uid] || undefined

          await uploadAndLinkFile({
            file: file.originFileObj as RcFile,
            entityType,
            entityId,
            description,
            userId: user.id
          })

          uploadedCount++
        } catch (error) {
          console.error('[useFileAttachment.uploadAllFiles] File upload error:', error)
          errorCount++
        }
      }

      // Показываем результаты
      if (uploadedCount > 0 && errorCount === 0) {
        message.success(`Успешно загружено файлов: ${uploadedCount}`)
      } else if (uploadedCount > 0 && errorCount > 0) {
        message.warning(`Загружено: ${uploadedCount}, ошибок: ${errorCount}`)
      } else if (errorCount > 0) {
        message.error(`Не удалось загрузить файлы: ${errorCount}`)
      }

      // Перезагружаем список файлов
      if (uploadedCount > 0) {
        await loadFiles()
      }

      // Очищаем список успешно загруженных файлов
      if (uploadedCount > 0) {
        setFileList([])
        setFileDescriptions({})
      }
    } catch (error) {
      console.error('[useFileAttachment.uploadAllFiles] Error:', error)
      message.error('Ошибка при загрузке файлов')
    } finally {
      setUploading(false)
    }
  }, [entityId, entityType, user, fileList, fileDescriptions, loadFiles])

  // Удаление существующего файла
  const handleDeleteFile = useCallback(async (fileId: string, storagePath: string): Promise<void> => {
    try {
      await deleteFile(fileId, storagePath)
      message.success('Файл успешно удален')
      await loadFiles()
    } catch (error) {
      console.error('[useFileAttachment.handleDeleteFile] Error:', error)
      message.error('Ошибка удаления файла')
    }
  }, [loadFiles])

  // Обновление описания существующего файла
  const handleUpdateDescription = useCallback(async (fileId: string, description: string): Promise<void> => {
    try {
      await updateFileDescription(fileId, description)
      message.success('Описание обновлено')
      await loadFiles()
    } catch (error) {
      console.error('[useFileAttachment.handleUpdateDescription] Error:', error)
      message.error('Ошибка обновления описания')
    }
  }, [loadFiles])

  // Сброс состояния
  const reset = useCallback(() => {
    setFileList([])
    setExistingFiles([])
    setFileDescriptions({})
  }, [])

  return {
    // Состояние
    fileList,
    existingFiles,
    fileDescriptions,
    loading,
    uploading,

    // Методы
    handleFileListChange,
    handleFileDescriptionChange,
    uploadFile,
    uploadAllFiles,
    handleDeleteFile,
    handleUpdateDescription,
    loadFiles,
    reset
  }
}