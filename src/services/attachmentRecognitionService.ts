import { supabase } from '../lib/supabase'

/**
 * Создает связь между оригинальным и распознанным файлом
 */
export async function createRecognitionLink(
  originalAttachmentId: string,
  recognizedAttachmentId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('attachment_recognitions')
    .insert({
      original_attachment_id: originalAttachmentId,
      recognized_attachment_id: recognizedAttachmentId,
      created_by: userId
    })

  if (error) throw error
}

/**
 * Получает ID распознанного файла для оригинала
 */
export async function getRecognizedAttachmentId(
  originalAttachmentId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('attachment_recognitions')
    .select('recognized_attachment_id')
    .eq('original_attachment_id', originalAttachmentId)
    .maybeSingle()

  if (error) throw error
  return data?.recognized_attachment_id || null
}

/**
 * Получает markdown содержимое распознанного файла
 */
export async function getRecognizedMarkdown(
  originalAttachmentId: string
): Promise<string | null> {
  // Получаем ID распознанного файла
  const recognizedId = await getRecognizedAttachmentId(originalAttachmentId)
  if (!recognizedId) return null

  // Получаем информацию о файле
  const { data: attachment, error: attachmentError } = await supabase
    .from('attachments')
    .select('storage_path')
    .eq('id', recognizedId)
    .single()

  if (attachmentError) throw attachmentError
  if (!attachment) return null

  // Скачиваем содержимое файла
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('attachments')
    .download(attachment.storage_path)

  if (downloadError) throw downloadError
  if (!fileData) return null

  // Читаем текст из blob
  const text = await fileData.text()
  return text
}

/**
 * Получает статусы распознавания для списка файлов
 */
export async function getRecognitionStatuses(
  attachmentIds: string[]
): Promise<Record<string, boolean>> {
  if (attachmentIds.length === 0) return {}

  const { data, error } = await supabase
    .from('attachment_recognitions')
    .select('original_attachment_id')
    .in('original_attachment_id', attachmentIds)

  if (error) throw error

  const statuses: Record<string, boolean> = {}
  attachmentIds.forEach(id => {
    statuses[id] = data?.some(r => r.original_attachment_id === id) || false
  })

  return statuses
}

/**
 * Удаляет связь распознавания (при удалении файла это произойдет автоматически через CASCADE)
 */
export async function deleteRecognitionLink(
  originalAttachmentId: string
): Promise<void> {
  const { error } = await supabase
    .from('attachment_recognitions')
    .delete()
    .eq('original_attachment_id', originalAttachmentId)

  if (error) throw error
}

