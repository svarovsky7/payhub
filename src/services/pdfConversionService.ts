import { message } from 'antd'
import JSZip from 'jszip'

const PDF_CONVERSION_API = 'https://pdf.fvds.ru'

/**
 * Конвертирует PDF в набор JPG изображений используя API https://pdf.fvds.ru
 * API принимает multipart/form-data с параметрами:
 * - files: массив PDF файлов
 * - dpi: качество (по умолчанию 200)
 * - jpeg_quality: качество JPEG (по умолчанию 85)
 * - separate_archives: раздельные архивы (по умолчанию false)
 * - mode: color | grayscale | binary (по умолчанию color)
 * - threshold: порог для binary режима 0..255 (по умолчанию 180)
 * 
 * Возвращает ZIP архив с JPG изображениями
 */
export async function convertPdfToJpg(pdfUrl: string): Promise<File[]> {
  try {
    // Скачиваем PDF файл
    const response = await fetch(pdfUrl)
    if (!response.ok) {
      throw new Error('Не удалось загрузить PDF файл')
    }
    
    const blob = await response.blob()
    const formData = new FormData()
    formData.append('files', blob, 'document.pdf')
    formData.append('dpi', '200')
    formData.append('jpeg_quality', '85')
    formData.append('mode', 'binary')
    formData.append('threshold', '180')

    // Отправляем на сервер конвертации
    const conversionResponse = await fetch(`${PDF_CONVERSION_API}/convert`, {
      method: 'POST',
      body: formData,
    })

    if (!conversionResponse.ok) {
      const errorText = await conversionResponse.text()
      console.error('[pdfConversionService] API Error:', errorText)
      throw new Error('Ошибка конвертации PDF')
    }

    // API возвращает ZIP архив
    const zipBlob = await conversionResponse.blob()
    
    // Распаковываем ZIP
    const zip = new JSZip()
    const zipContent = await zip.loadAsync(zipBlob)
    
    const files: File[] = []
    const fileNames = Object.keys(zipContent.files).sort()
    
    for (const fileName of fileNames) {
      const fileData = zipContent.files[fileName]
      if (!fileData.dir) {
        const content = await fileData.async('blob')
        const file = new File([content], fileName, { type: 'image/jpeg' })
        files.push(file)
      }
    }

    if (files.length === 0) {
      throw new Error('В архиве не найдено изображений')
    }

    return files
  } catch (error) {
    console.error('[pdfConversionService] Error:', error)
    throw error
  }
}

/**
 * Загружает файлы в Supabase storage и привязывает к письму
 */
export async function uploadConvertedImages(
  files: File[],
  letterId: string,
  originalFileName: string,
  supabase: any,
  userId: string
): Promise<void> {
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const storagePath = `letters/${letterId}/${Date.now()}_${file.name}`

      // Загружаем файл в storage
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(storagePath, file)

      if (uploadError) throw uploadError

      // Создаем запись в таблице attachments
      const { data: attachment, error: attachmentError } = await supabase
        .from('attachments')
        .insert({
          original_name: file.name,
          storage_path: storagePath,
          size_bytes: file.size,
          mime_type: file.type,
          description: `Страница ${i + 1} из ${originalFileName}`,
          created_by: userId
        })
        .select()
        .single()

      if (attachmentError) throw attachmentError

      // Привязываем к письму
      const { error: linkError } = await supabase
        .from('letter_attachments')
        .insert({
          letter_id: letterId,
          attachment_id: attachment.id
        })

      if (linkError) throw linkError
    }

    message.success(`Добавлено ${files.length} изображений`)
  } catch (error) {
    console.error('[pdfConversionService] Upload error:', error)
    throw new Error('Ошибка загрузки изображений')
  }
}

