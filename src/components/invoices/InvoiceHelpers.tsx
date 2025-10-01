import { supabase } from '../../lib/supabase'

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