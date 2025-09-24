import { supabase } from '../../lib/supabase'
import type { UploadFile } from 'antd/es/upload/interface'
import { message } from 'antd'

interface FileWithDescription extends UploadFile {
  description?: string
  existingAttachmentId?: string
}

export const deleteRemovedFiles = async (originalFiles: FileWithDescription[], currentFiles: FileWithDescription[], invoiceId: string) => {
  console.log('[InvoiceOperations.deleteRemovedFiles] Checking for removed files')

  const currentIds = new Set(currentFiles.map(f => f.existingAttachmentId).filter(Boolean))
  const filesToDelete = originalFiles.filter(f => f.existingAttachmentId && !currentIds.has(f.existingAttachmentId))

  for (const file of filesToDelete) {
    if (!file.existingAttachmentId) continue

    console.log('[InvoiceOperations.deleteRemovedFiles] Deleting file:', file.name)

    try {
      // Получаем информацию о файле
      const { data: attachment, error: fetchError } = await supabase
        .from('attachments')
        .select('storage_path')
        .eq('id', file.existingAttachmentId)
        .single()

      if (fetchError) {
        console.error('[InvoiceOperations.deleteRemovedFiles] Error fetching attachment:', fetchError)
        continue
      }

      // Удаляем файл из Storage
      if (attachment?.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('attachments')
          .remove([attachment.storage_path])

        if (storageError) {
          console.error('[InvoiceOperations.deleteRemovedFiles] Storage deletion error:', storageError)
        }
      }

      // Удаляем связь из invoice_attachments
      const { error: linkError } = await supabase
        .from('invoice_attachments')
        .delete()
        .eq('invoice_id', invoiceId)
        .eq('attachment_id', file.existingAttachmentId)

      if (linkError) {
        console.error('[InvoiceOperations.deleteRemovedFiles] Link deletion error:', linkError)
      }

      // Удаляем запись из attachments
      const { error: deleteError } = await supabase
        .from('attachments')
        .delete()
        .eq('id', file.existingAttachmentId)

      if (deleteError) {
        console.error('[InvoiceOperations.deleteRemovedFiles] Attachment deletion error:', deleteError)
      }

      console.log('[InvoiceOperations.deleteRemovedFiles] File deleted successfully:', file.name)
    } catch (error) {
      console.error('[InvoiceOperations.deleteRemovedFiles] Error deleting file:', file.name, error)
    }
  }
}

export const updateFileDescriptions = async (files: FileWithDescription[]) => {
  console.log('[InvoiceOperations.updateFileDescriptions] Updating descriptions for existing files')

  let updatedCount = 0
  const errors: string[] = []

  for (const file of files) {
    // Обновляем описания только для существующих файлов
    if (file.existingAttachmentId && file.description !== undefined) {
      console.log('[InvoiceOperations.updateFileDescriptions] Updating description for:', file.name)

      const { error } = await supabase
        .from('attachments')
        .update({ description: file.description })
        .eq('id', file.existingAttachmentId)

      if (error) {
        console.error('[InvoiceOperations.updateFileDescriptions] Error updating description:', error)
        errors.push(file.name)
      } else {
        updatedCount++
      }
    }
  }

  if (errors.length > 0) {
    console.error('[InvoiceOperations.updateFileDescriptions] Failed to update descriptions for:', errors)
  }

  return { updatedCount, errors }
}

export const processInvoiceFiles = async (invoiceId: string, files: FileWithDescription[], userId: string) => {
  console.log('[InvoiceOperations.processFiles] Processing files for invoice:', invoiceId)

  if (!files || files.length === 0) {
    console.log('[InvoiceOperations.processFiles] No files to process')
    return
  }

  // Сначала обновляем описания существующих файлов
  const { errors: descriptionErrors } = await updateFileDescriptions(files)
  if (descriptionErrors.length > 0) {
    message.warning(`Не удалось обновить описания для некоторых файлов`)
  }

  const uploadedFiles: string[] = []
  const failedFiles: string[] = []

  for (const file of files) {
    try {
      console.log('[InvoiceOperations.processFiles] Processing file:', file.name)

      // Если это существующий файл (уже загружен ранее), пропускаем загрузку
      if (file.status === 'done' && file.existingAttachmentId) {
        console.log('[InvoiceOperations.processFiles] Skipping existing file:', file.name)
        continue
      }

      // Пропускаем файлы, которые были помечены для удаления
      if ((file as any).deleted) {
        console.log('[InvoiceOperations.processFiles] Skipping deleted file:', file.name)
        continue
      }

      if (!file.originFileObj) {
        console.log('[InvoiceOperations.processFiles] No originFileObj for file:', file.name)
        continue
      }

      // Генерируем уникальное имя файла
      const fileName = `${Date.now()}_${file.name}`
      const filePath = `invoices/${invoiceId}/${fileName}`

      // Загружаем файл в Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file.originFileObj)

      if (uploadError) {
        console.error('[InvoiceOperations.processFiles] Storage upload error:', uploadError)
        failedFiles.push(file.name)
        continue
      }

      console.log('[InvoiceOperations.processFiles] File uploaded to storage:', uploadData.path)

      // Создаем запись в таблице attachments
      const { data: attachment, error: attachmentError } = await supabase
        .from('attachments')
        .insert({
          original_name: file.name,
          storage_path: uploadData.path,
          size_bytes: file.size || 0,
          mime_type: file.type || 'application/octet-stream',
          description: file.description || null,
          created_by: userId // Используем created_by вместо uploaded_by
        })
        .select()
        .single()

      if (attachmentError) {
        console.error('[InvoiceOperations.processFiles] Attachment creation error:', attachmentError)
        // Пытаемся удалить файл из Storage
        await supabase.storage.from('attachments').remove([uploadData.path])
        failedFiles.push(file.name)
        continue
      }

      // Создаем связь в таблице invoice_attachments
      const { error: linkError } = await supabase
        .from('invoice_attachments')
        .insert({
          invoice_id: invoiceId,
          attachment_id: attachment.id
        })

      if (linkError) {
        console.error('[InvoiceOperations.processFiles] Link creation error:', linkError)
        // Пытаемся удалить запись и файл
        await supabase.from('attachments').delete().eq('id', attachment.id)
        await supabase.storage.from('attachments').remove([uploadData.path])
        failedFiles.push(file.name)
        continue
      }

      uploadedFiles.push(file.name)
      console.log('[InvoiceOperations.processFiles] File processed successfully:', file.name)
    } catch (error) {
      console.error('[InvoiceOperations.processFiles] Unexpected error processing file:', file.name, error)
      failedFiles.push(file.name)
    }
  }

  if (uploadedFiles.length > 0) {
    message.success(`Успешно загружено файлов: ${uploadedFiles.length}`)
  }

  if (failedFiles.length > 0) {
    message.error(`Не удалось загрузить файлов: ${failedFiles.length}`)
  }

  console.log('[InvoiceOperations.processFiles] Processing complete. Uploaded:', uploadedFiles.length, 'Failed:', failedFiles.length)
}