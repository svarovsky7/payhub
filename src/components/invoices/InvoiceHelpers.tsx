import { supabase } from '../../lib/supabase'
import type { Payment } from '../../lib/supabase'

// File operations
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export const handlePreviewFile = async (attachment: any) => {
  try {

    const { data, error } = await supabase.storage
      .from('attachments')
      .download(attachment.storage_path)

    if (error) {
      console.error('[InvoiceView.handlePreview] Error:', error)
      throw new Error('Ошибка загрузки файла для просмотра')
    }

    // Создаем URL для предпросмотра
    const url = URL.createObjectURL(data)
    const mimeType = attachment.mime_type || ''
    const fileName = attachment.original_name || 'Файл'

    // Определяем тип файла для предпросмотра
    if (mimeType.startsWith('image/')) {
      return { url, name: fileName, type: mimeType }
    } else if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      return { url, name: fileName, type: 'application/pdf' }
    } else {
      // Для других типов файлов открываем в новом окне
      const newWindow = window.open(url, '_blank')
      if (!newWindow) {
        throw new Error('Не удалось открыть файл. Проверьте настройки блокировки всплывающих окон.')
      }
      setTimeout(() => URL.revokeObjectURL(url), 100)
      return null
    }
  } catch (error) {
    console.error('[InvoiceView.handlePreview] Error:', error)
    throw error
  }
}

export const handleDownloadFile = async (attachment: any) => {
  try {

    const { data, error } = await supabase.storage
      .from('attachments')
      .download(attachment.storage_path)

    if (error) {
      console.error('[InvoiceView.handleDownload] Error:', error)
      throw new Error('Ошибка загрузки файла')
    }

    // Создаем ссылку для скачивания
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = attachment.original_name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

  } catch (error) {
    console.error('[InvoiceView.handleDownload] Error:', error)
    throw error
  }
}

export const handleDeleteAttachmentFile = async (attachment: any, invoiceId: string, loadAttachments: () => void, messageApi: any) => {
  try {

    // Сначала удаляем файл из Storage
    const { error: storageError } = await supabase.storage
      .from('attachments')
      .remove([attachment.storage_path])

    if (storageError) {
      console.error('[InvoiceView.handleDeleteAttachment] Storage deletion error:', storageError)
      // Продолжаем даже если не удалось удалить файл из Storage
    }

    // Удаляем связь из invoice_attachments
    const { error: linkError } = await supabase
      .from('invoice_attachments')
      .delete()
      .eq('invoice_id', invoiceId)
      .eq('attachment_id', attachment.id)

    if (linkError) {
      console.error('[InvoiceView.handleDeleteAttachment] Link deletion error:', linkError)
      throw linkError
    }

    // Удаляем запись из attachments
    const { error: attachmentError } = await supabase
      .from('attachments')
      .delete()
      .eq('id', attachment.id)

    if (attachmentError) {
      console.error('[InvoiceView.handleDeleteAttachment] Attachment deletion error:', attachmentError)
      throw attachmentError
    }

    messageApi.success('Файл успешно удалён')

    // Обновляем список файлов
    await loadAttachments()

  } catch (error) {
    console.error('[InvoiceView.handleDeleteAttachment] Error:', error)
    messageApi.error('Ошибка удаления файла')
  }
}

// Payment operations
export const loadPaymentFiles = async (paymentId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('payment_attachments')
      .select(`
        attachment_id,
        attachments (
          id,
          original_name,
          storage_path,
          size_bytes,
          mime_type,
          description
        )
      `)
      .eq('payment_id', paymentId)

    if (!error && data) {
      const existingFiles = await Promise.all(data.map(async item => {
        const attachment = (item as any).attachments
        // Создаём правильный URL для скачивания файла
        const { data: urlData } = await supabase.storage
          .from('attachments')
          .createSignedUrl(attachment.storage_path, 3600) // URL действует час

        return {
          uid: attachment.id,
          name: attachment.original_name,
          size: attachment.size_bytes,
          type: attachment.mime_type,
          status: 'done' as const,
          url: urlData?.signedUrl || '',
          existingAttachmentId: attachment.id
        }
      }))

      return existingFiles
    }
    return []
  } catch (error) {
    console.error('[loadPaymentFiles] Error loading attachments:', error)
    return []
  }
}

// Calculate payment totals
export const calculatePaymentTotals = (payments: Payment[]) => {
  const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0)
  return totalPaid
}