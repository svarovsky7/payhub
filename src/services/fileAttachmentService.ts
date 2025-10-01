import { supabase } from '../lib/supabase'
import type { RcFile } from 'antd/es/upload'
import type { ExistingFile } from '../components/common/FileUploadBlock'

// Типы сущностей
export type EntityType = 'invoice' | 'payment' | 'contract' | 'material_request'

// Интерфейс для загрузки файла
interface UploadFileParams {
  file: RcFile | File
  entityType: EntityType
  entityId: string
  description?: string
  userId: string
}

// Интерфейс для привязки файла к сущности
interface LinkFileParams {
  attachmentId: string
  entityType: EntityType
  entityId: string
}

/**
 * Загружает файл в storage и создает запись в таблице attachments
 */
const uploadFile = async ({
  file,
  entityType,
  entityId,
  description,
  userId
}: UploadFileParams): Promise<string> => {
  try {
    console.log('[fileAttachmentService.uploadFile] Starting upload:', {
      fileName: file.name,
      entityType,
      entityId,
      fileSize: file.size
    })

    // Генерируем уникальный путь для файла
    const timestamp = Date.now()
    const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_') // Очищаем имя файла
    const storagePath = `${entityType}/${entityId}/${timestamp}_${fileName}`

    // Загружаем файл в storage
    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('[fileAttachmentService.uploadFile] Upload error:', uploadError)
      throw uploadError
    }

    // Создаем запись в таблице attachments
    const { data: attachment, error: dbError } = await supabase
      .from('attachments')
      .insert({
        original_name: file.name,
        storage_path: storagePath,
        size_bytes: file.size,
        mime_type: file.type || 'application/octet-stream',
        description: description || null,
        created_by: userId // Используем created_by вместо uploaded_by
      })
      .select()
      .single()

    if (dbError) {
      console.error('[fileAttachmentService.uploadFile] DB error:', dbError)
      // Пытаемся удалить загруженный файл из storage
      await supabase.storage
        .from('attachments')
        .remove([storagePath])
      throw dbError
    }

    console.log('[fileAttachmentService.uploadFile] File uploaded successfully:', attachment.id)
    return attachment.id
  } catch (error) {
    console.error('[fileAttachmentService.uploadFile] Error:', error)
    throw error
  }
}

/**
 * Привязывает файл к конкретной сущности
 */
const linkFileToEntity = async ({
  attachmentId,
  entityType,
  entityId
}: LinkFileParams): Promise<void> => {
  try {
    console.log('[fileAttachmentService.linkFileToEntity] Linking file:', {
      attachmentId,
      entityType,
      entityId
    })

    // Определяем таблицу связи в зависимости от типа сущности
    let tableName: string
    let linkData: Record<string, string>

    switch (entityType) {
      case 'invoice':
        tableName = 'invoice_attachments'
        linkData = {
          invoice_id: entityId,
          attachment_id: attachmentId
        }
        break
      case 'payment':
        tableName = 'payment_attachments'
        linkData = {
          payment_id: entityId,
          attachment_id: attachmentId
        }
        break
      case 'contract':
        tableName = 'contract_attachments'
        linkData = {
          contract_id: entityId,
          attachment_id: attachmentId
        }
        break
      case 'material_request':
        tableName = 'material_request_attachments'
        linkData = {
          material_request_id: entityId,
          attachment_id: attachmentId
        }
        break
      default:
        throw new Error(`Unknown entity type: ${entityType}`)
    }

    // Создаем связь
    const { error } = await supabase
      .from(tableName)
      .insert(linkData)

    if (error) {
      console.error('[fileAttachmentService.linkFileToEntity] Link error:', error)
      throw error
    }

    console.log('[fileAttachmentService.linkFileToEntity] File linked successfully')
  } catch (error) {
    console.error('[fileAttachmentService.linkFileToEntity] Error:', error)
    throw error
  }
}

/**
 * Загружает файл и сразу привязывает к сущности
 */
export const uploadAndLinkFile = async (params: UploadFileParams): Promise<string> => {
  try {
    // Загружаем файл
    const attachmentId = await uploadFile(params)

    // Привязываем к сущности
    await linkFileToEntity({
      attachmentId,
      entityType: params.entityType,
      entityId: params.entityId
    })

    return attachmentId
  } catch (error) {
    console.error('[fileAttachmentService.uploadAndLinkFile] Error:', error)
    throw error
  }
}

/**
 * Загружает список файлов для сущности
 */
export const loadEntityFiles = async (
  entityType: EntityType,
  entityId: string
): Promise<ExistingFile[]> => {
  try {
    console.log('[fileAttachmentService.loadEntityFiles] Loading files:', {
      entityType,
      entityId
    })

    let tableName: string
    let filterColumn: string

    switch (entityType) {
      case 'invoice':
        tableName = 'invoice_attachments'
        filterColumn = 'invoice_id'
        break
      case 'payment':
        tableName = 'payment_attachments'
        filterColumn = 'payment_id'
        break
      case 'contract':
        tableName = 'contract_attachments'
        filterColumn = 'contract_id'
        break
      case 'material_request':
        tableName = 'material_request_attachments'
        filterColumn = 'material_request_id'
        break
      default:
        throw new Error(`Unknown entity type: ${entityType}`)
    }

    // Загружаем файлы с информацией из таблицы attachments
    const { data, error } = await supabase
      .from(tableName)
      .select(`
        attachment_id,
        attachments (
          id,
          original_name,
          storage_path,
          size_bytes,
          mime_type,
          description,
          created_at
        )
      `)
      .eq(filterColumn, entityId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[fileAttachmentService.loadEntityFiles] Load error:', error)
      throw error
    }

    // Преобразуем данные в нужный формат
    const files: ExistingFile[] = (data || [])
      .map((item: any) => {
        if (!item.attachments) return null
        return {
          ...item.attachments,
          attachment_id: item.attachment_id
        } as ExistingFile
      })
      .filter((item): item is ExistingFile => item !== null)

    console.log('[fileAttachmentService.loadEntityFiles] Files loaded:', files.length)
    return files
  } catch (error) {
    console.error('[fileAttachmentService.loadEntityFiles] Error:', error)
    throw error
  }
}

/**
 * Удаляет файл и все его связи
 */
export const deleteFile = async (
  fileId: string,
  storagePath: string
): Promise<void> => {
  try {
    console.log('[fileAttachmentService.deleteFile] Deleting file:', {
      fileId,
      storagePath
    })

    // Удаляем файл из storage
    const { error: storageError } = await supabase.storage
      .from('attachments')
      .remove([storagePath])

    if (storageError) {
      console.error('[fileAttachmentService.deleteFile] Storage error:', storageError)
      // Продолжаем удаление из БД даже если не удалось удалить из storage
    }

    // Удаляем запись из таблицы attachments (связи удалятся каскадно)
    const { error: dbError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', fileId)

    if (dbError) {
      console.error('[fileAttachmentService.deleteFile] DB error:', dbError)
      throw dbError
    }

    console.log('[fileAttachmentService.deleteFile] File deleted successfully')
  } catch (error) {
    console.error('[fileAttachmentService.deleteFile] Error:', error)
    throw error
  }
}

/**
 * Обновляет описание файла
 */
export const updateFileDescription = async (
  fileId: string,
  description: string
): Promise<void> => {
  try {
    console.log('[fileAttachmentService.updateFileDescription] Updating description:', {
      fileId,
      description
    })

    const { error } = await supabase
      .from('attachments')
      .update({ description })
      .eq('id', fileId)

    if (error) {
      console.error('[fileAttachmentService.updateFileDescription] Update error:', error)
      throw error
    }

    console.log('[fileAttachmentService.updateFileDescription] Description updated successfully')
  } catch (error) {
    console.error('[fileAttachmentService.updateFileDescription] Error:', error)
    throw error
  }
}

