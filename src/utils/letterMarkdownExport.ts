import JSZip from 'jszip'
import { supabase } from '../lib/supabase'
import { message } from 'antd'

/**
 * Скачивает все markdown документы всех писем в виде ZIP архива
 */
export const downloadAllLetterMarkdowns = async () => {
  try {
    message.loading({ content: 'Загрузка markdown документов...', key: 'markdown-download' })

    // Загружаем все письма с вложениями
    const { data: letters, error: lettersError } = await supabase
      .from('letters')
      .select(`
        id,
        reg_number,
        number,
        subject,
        attachments:letter_attachments(
          attachment:attachments(
            id,
            original_name,
            storage_path,
            mime_type
          )
        )
      `)

    if (lettersError) throw lettersError

    if (!letters || letters.length === 0) {
      message.warning({ content: 'Письма не найдены', key: 'markdown-download' })
      return
    }

    // Собираем все markdown файлы
    const markdownFiles: Array<{
      letterId: string
      regNumber: string
      subject: string
      storagePath: string
      originalName: string
    }> = []

    letters.forEach((letter: any) => {
      const regNumber = letter.reg_number || letter.number || 'no-number'
      const subject = letter.subject || 'Без темы'
      
      letter.attachments?.forEach((att: any) => {
        if (att.attachment?.mime_type === 'text/markdown') {
          markdownFiles.push({
            letterId: letter.id.substring(0, 8),
            regNumber,
            subject,
            storagePath: att.attachment.storage_path,
            originalName: att.attachment.original_name
          })
        }
      })
    })

    if (markdownFiles.length === 0) {
      message.info({ content: 'Markdown документы не найдены', key: 'markdown-download' })
      return
    }

    message.loading({ content: `Скачивание ${markdownFiles.length} файлов...`, key: 'markdown-download' })

    // Создаем ZIP архив
    const zip = new JSZip()

    // Скачиваем каждый markdown файл и добавляем в архив
    for (const file of markdownFiles) {
      try {
        const { data, error } = await supabase.storage
          .from('attachments')
          .download(file.storagePath)

        if (error) throw error
        if (!data) continue

        const text = await data.text()
        
        // Формируем имя файла: regNumber_letterId_originalName
        const fileName = `${file.regNumber}_${file.letterId}_${file.originalName}`
        zip.file(fileName, text)
      } catch (error) {
        console.error(`Ошибка загрузки файла ${file.originalName}:`, error)
      }
    }

    message.loading({ content: 'Формирование архива...', key: 'markdown-download' })

    // Генерируем ZIP файл
    const zipBlob = await zip.generateAsync({ type: 'blob' })

    // Скачиваем архив
    const url = window.URL.createObjectURL(zipBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `письма_markdown_${new Date().toISOString().split('T')[0]}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    message.success({ content: `Скачано ${markdownFiles.length} документов`, key: 'markdown-download' })
  } catch (error) {
    console.error('[letterMarkdownExport] Ошибка:', error)
    message.error({ content: 'Ошибка при скачивании документов', key: 'markdown-download' })
  }
}

