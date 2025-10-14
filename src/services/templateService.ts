import { supabase } from '../lib/supabase'
import { message } from 'antd'

const TEMPLATE_BUCKET = 'attachments'
const LETTER_TEMPLATE_PATH = 'templates/letter_template.docx'

/**
 * Get the current letter template file information
 */
export const getLetterTemplate = async (): Promise<{ exists: boolean; url?: string; lastModified?: string }> => {
  try {
    console.log('[templateService.getLetterTemplate] Checking for template')

    // Check if file exists in templates folder
    const { data: files, error: listError } = await supabase.storage
      .from(TEMPLATE_BUCKET)
      .list('templates', {
        limit: 100,
        offset: 0
      })

    if (listError) {
      console.error('[templateService.getLetterTemplate] List error:', listError)
      throw listError
    }

    const templateFile = files?.find(f => f.name === 'letter_template.docx')

    if (!templateFile) {
      console.log('[templateService.getLetterTemplate] Template not found')
      return { exists: false }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(TEMPLATE_BUCKET)
      .getPublicUrl(LETTER_TEMPLATE_PATH)

    return {
      exists: true,
      url: urlData.publicUrl,
      lastModified: templateFile.updated_at || templateFile.created_at
    }
  } catch (error) {
    console.error('[templateService.getLetterTemplate] Error:', error)
    return { exists: false }
  }
}

/**
 * Upload or update the letter template
 */
export const uploadLetterTemplate = async (file: File): Promise<void> => {
  try {
    console.log('[templateService.uploadLetterTemplate] Uploading template:', file.name)

    // Validate file type
    if (!file.name.endsWith('.docx')) {
      throw new Error('Файл должен быть в формате DOCX')
    }

    // Check file size (max 10MB for templates)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      throw new Error('Размер файла не должен превышать 10 МБ')
    }

    // Upload file (upsert will replace existing file)
    const { error: uploadError } = await supabase.storage
      .from(TEMPLATE_BUCKET)
      .upload(LETTER_TEMPLATE_PATH, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('[templateService.uploadLetterTemplate] Upload error:', uploadError)

      // Provide user-friendly error messages
      if (uploadError.message.includes('Failed to fetch') || uploadError.message.includes('CORS')) {
        throw new Error('Ошибка подключения к серверу хранилища. Обратитесь к администратору.')
      } else if (uploadError.message.includes('not found') || uploadError.message.includes('404') || uploadError.message.includes('Bucket not found')) {
        throw new Error('Хранилище файлов не найдено. Убедитесь, что bucket "attachments" существует в Supabase Storage.')
      }

      throw uploadError
    }

    console.log('[templateService.uploadLetterTemplate] Template uploaded successfully')
    message.success('Шаблон успешно загружен')
  } catch (error: unknown) {
    console.error('[templateService.uploadLetterTemplate] Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Ошибка загрузки шаблона'
    message.error(errorMessage)
    throw error
  }
}

/**
 * Delete the letter template
 */
export const deleteLetterTemplate = async (): Promise<void> => {
  try {
    console.log('[templateService.deleteLetterTemplate] Deleting template')

    const { error } = await supabase.storage
      .from(TEMPLATE_BUCKET)
      .remove([LETTER_TEMPLATE_PATH])

    if (error) {
      console.error('[templateService.deleteLetterTemplate] Delete error:', error)
      throw error
    }

    console.log('[templateService.deleteLetterTemplate] Template deleted successfully')
    message.success('Шаблон успешно удалён')
  } catch (error) {
    console.error('[templateService.deleteLetterTemplate] Error:', error)
    message.error('Ошибка удаления шаблона')
    throw error
  }
}

/**
 * Download the letter template file as blob
 */
export const downloadLetterTemplateBlob = async (): Promise<Blob> => {
  try {
    console.log('[templateService.downloadLetterTemplateBlob] Downloading template')

    const { data, error } = await supabase.storage
      .from(TEMPLATE_BUCKET)
      .download(LETTER_TEMPLATE_PATH)

    if (error) {
      console.error('[templateService.downloadLetterTemplateBlob] Download error:', error)
      throw error
    }

    if (!data) {
      throw new Error('Template file not found')
    }

    return data
  } catch (error) {
    console.error('[templateService.downloadLetterTemplateBlob] Error:', error)
    throw error
  }
}
