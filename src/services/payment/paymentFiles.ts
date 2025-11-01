import { supabase } from '../../lib/supabase'
import type { UploadFile } from 'antd/es/upload/interface'
import { message } from 'antd'

interface FileWithDescription extends UploadFile {
  description?: string
}

export const processPaymentFiles = async (paymentId: string, files: FileWithDescription[], userId: string) => {
  // Get current files for this payment
  const { data: currentAttachments } = await supabase
    .from('payment_attachments')
    .select(`
      attachment_id,
      attachments (
        id,
        original_name,
        storage_path
      )
    `)
    .eq('payment_id', paymentId)

  const currentFileIds = new Set(
    currentAttachments?.map(item => (item as any).attachments?.id).filter(Boolean) || []
  )

  // Max file size: 50MB (configurable based on server limits)
  const MAX_FILE_SIZE = 50 * 1024 * 1024

  // Process each file
  for (const file of files) {
    // Skip already existing files
    if ((file as any).existingAttachmentId) {
      currentFileIds.delete((file as any).existingAttachmentId)
      continue
    }

    try {
      const fileToUpload = (file as any).originFileObj || file

      if (!(fileToUpload instanceof File || fileToUpload instanceof Blob)) {
        console.warn('[PaymentFiles.processPaymentFiles] Invalid file object:', file)
        continue
      }

      // Check file size
      const fileSize = file.size || fileToUpload.size || 0
      if (fileSize > MAX_FILE_SIZE) {
        const sizeMB = (fileSize / (1024 * 1024)).toFixed(2)
        console.error('[PaymentFiles.processPaymentFiles] File too large:', { name: file.name, sizeMB })
        message.error(`Файл "${file.name}" слишком большой (${sizeMB} МБ). Максимальный размер: 50 МБ`)
        continue
      }

      const timestamp = Date.now()
      const originalName = file.name || (fileToUpload instanceof File ? fileToUpload.name : 'file')
      const fileName = `${timestamp}_${originalName}`
      const storagePath = `payments/${paymentId}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(storagePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        console.error('[PaymentFiles.processPaymentFiles] Upload error:', uploadError)
        let errorMessage = uploadError.message
        if (uploadError.message.includes('Failed to fetch') || uploadError.message.includes('CORS')) {
          errorMessage = 'Ошибка подключения к серверу хранилища. Обратитесь к администратору.'
        } else if (uploadError.message.includes('not found') || uploadError.message.includes('404')) {
          errorMessage = 'Хранилище файлов не настроено. Обратитесь к администратору.'
        }
        message.error(`Ошибка загрузки файла ${fileName}: ${errorMessage}`)
        continue
      }

      const attachmentData = {
        original_name: originalName,
        storage_path: storagePath,
        size_bytes: file.size || fileToUpload.size || 0,
        mime_type: file.type || fileToUpload.type || 'application/octet-stream',
        description: file.description || null,
        created_by: userId,
      }

      const { data: attachment, error: attachmentError } = await supabase
        .from('attachments')
        .insert([attachmentData])
        .select()
        .single()

      if (attachmentError) {
        console.error('[PaymentFiles.processPaymentFiles] Attachment DB error:', attachmentError)
        continue
      }

      const { error: linkError } = await supabase
        .from('payment_attachments')
        .insert([
          {
            payment_id: paymentId,
            attachment_id: attachment.id,
          },
        ])

      if (linkError) {
        console.error('[PaymentFiles.processPaymentFiles] Link error:', linkError)
      }
    } catch (fileError) {
      console.error('[PaymentFiles.processPaymentFiles] File processing error:', fileError)
      message.error(`Ошибка обработки файла ${file.name}`)
    }
  }

  // Delete files that were removed
  for (const attachmentId of currentFileIds) {
    const { data: fileInfo } = await supabase
      .from('attachments')
      .select('storage_path')
      .eq('id', attachmentId)
      .single()

    if (fileInfo?.storage_path) {
      const { error: deleteStorageError } = await supabase.storage
        .from('attachments')
        .remove([fileInfo.storage_path])

      if (deleteStorageError) {
        console.error('[PaymentFiles.processPaymentFiles] Storage deletion error:', deleteStorageError)
      }
    }

    const { error: deleteError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', attachmentId)

    if (deleteError) {
      console.error('[PaymentFiles.processPaymentFiles] Attachment deletion error:', deleteError)
    }
  }
}
