import { supabase } from '../lib/supabase'
import type { Letter } from '../lib/supabase'
import { message } from 'antd'

/**
 * Добавляет YAML блок в начало markdown файлов писем
 */
export async function addYamlToLetterMarkdowns(letters: Letter[]): Promise<void> {
  try {
    console.log('[addYamlToLetterMarkdowns] Starting processing', letters.length, 'letters')
    
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    
    if (!userId) {
      throw new Error('User not authenticated')
    }

    let processedCount = 0

    // Обрабатываем все письма (включая дочерние)
    const allLetters: Letter[] = []
    const collectLetters = (lettersList: Letter[]) => {
      lettersList.forEach(letter => {
        allLetters.push(letter)
        if (letter.children) {
          collectLetters(letter.children)
        }
      })
    }
    collectLetters(letters)

    console.log('[addYamlToLetterMarkdowns] Total letters to process:', allLetters.length)

    for (const letter of allLetters) {
      try {
        // Получаем вложения письма
        const { data: letterAttachments, error: attachmentsError } = await supabase
          .from('letter_attachments')
          .select(`
            attachment_id,
            attachments(id, original_name, storage_path, mime_type)
          `)
          .eq('letter_id', letter.id)

        if (attachmentsError) {
          console.error('[addYamlToLetterMarkdowns] Error loading attachments:', attachmentsError)
          continue
        }

        if (!letterAttachments || letterAttachments.length === 0) {
          continue
        }

        // Для каждого вложения проверяем есть ли распознанный markdown
        for (const attachment of letterAttachments) {
          const att = (attachment as any).attachments
          if (!att) continue

          // Проверяем есть ли распознанная версия
          const { data: recognition, error: recognitionError } = await supabase
            .from('attachment_recognitions')
            .select(`
              recognized_attachment_id,
              recognized_attachment:attachments!recognized_attachment_id(
                id, original_name, storage_path, mime_type
              )
            `)
            .eq('original_attachment_id', att.id)
            .maybeSingle()

          if (recognitionError) {
            console.error('[addYamlToLetterMarkdowns] Error checking recognition:', recognitionError)
            continue
          }

          if (!recognition) {
            continue
          }

          const recognizedAtt = (recognition as any).recognized_attachment
          if (!recognizedAtt) continue

          // Проверяем что это markdown файл
          const isMarkdown = recognizedAtt.mime_type?.includes('markdown') || 
                            recognizedAtt.original_name?.endsWith('.md')
          
          if (!isMarkdown) continue

          console.log('[addYamlToLetterMarkdowns] Processing markdown:', recognizedAtt.original_name)

          // Скачиваем файл
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('attachments')
            .download(recognizedAtt.storage_path)

          if (downloadError) {
            console.error('[addYamlToLetterMarkdowns] Error downloading file:', downloadError)
            continue
          }

          // Читаем содержимое
          const content = await fileData.text()

          // Создаем YAML блок
          const yaml = await createYamlBlock(letter.id)

          // Проверяем есть ли уже YAML блок и заменяем или добавляем
          let newContent: string
          if (content.trim().startsWith('---')) {
            // Заменяем существующий YAML
            const endIndex = content.indexOf('\n---\n', 4)
            if (endIndex !== -1) {
              newContent = yaml + '\n' + content.substring(endIndex + 5)
            } else {
              newContent = yaml + '\n' + content
            }
            console.log('[addYamlToLetterMarkdowns] Replacing existing YAML block')
          } else {
            // Добавляем YAML в начало
            newContent = yaml + '\n' + content
            console.log('[addYamlToLetterMarkdowns] Adding new YAML block')
          }

          // Загружаем обратно
          const blob = new Blob([newContent], { type: 'text/markdown' })
          const { error: uploadError } = await supabase.storage
            .from('attachments')
            .update(recognizedAtt.storage_path, blob, {
              contentType: 'text/markdown',
              upsert: true
            })

          if (uploadError) {
            console.error('[addYamlToLetterMarkdowns] Error uploading file:', uploadError)
            continue
          }

          console.log('[addYamlToLetterMarkdowns] Successfully added YAML to:', recognizedAtt.original_name)
          processedCount++
        }
      } catch (error) {
        console.error('[addYamlToLetterMarkdowns] Error processing letter:', letter.id, error)
      }
    }

    console.log('[addYamlToLetterMarkdowns] Processing complete:', {
      processed: processedCount,
      total: allLetters.length
    })

    if (processedCount > 0) {
      message.success(`Обработано файлов: ${processedCount}`)
    } else {
      message.info('Нет файлов для обработки')
    }
  } catch (error) {
    console.error('[addYamlToLetterMarkdowns] Error:', error)
    message.error('Ошибка обработки файлов')
    throw error
  }
}

/**
 * Создает YAML блок с данными письма (идентичен логике из AttachmentRecognitionModal)
 */
async function createYamlBlock(letterId: string): Promise<string> {
  // Получаем полную информацию о письме
  const { data: fullLetter } = await supabase
    .from('letters')
    .select('*')
    .eq('id', letterId)
    .single()

  // Загружаем связанные данные
  let projectName = ''
  let creatorName = ''
  let senderName = ''
  let recipientName = ''
  
  if (fullLetter?.project_id) {
    const { data: proj } = await supabase.from('projects').select('name').eq('id', fullLetter.project_id).single()
    projectName = proj?.name || ''
  }
  
  if (fullLetter?.created_by) {
    const { data: creator } = await supabase.from('user_profiles').select('full_name').eq('id', fullLetter.created_by).single()
    creatorName = creator?.full_name || ''
  }
  
  if (fullLetter?.sender_type === 'contractor' && fullLetter?.sender_contractor_id) {
    const { data: sender } = await supabase.from('contractors').select('name').eq('id', fullLetter.sender_contractor_id).single()
    senderName = sender?.name || ''
  }
  
  if (fullLetter?.recipient_type === 'contractor' && fullLetter?.recipient_contractor_id) {
    const { data: recipient } = await supabase.from('contractors').select('name').eq('id', fullLetter.recipient_contractor_id).single()
    recipientName = recipient?.name || ''
  }

  // Получаем вложения письма
  const { data: letterAttachments } = await supabase
    .from('letter_attachments')
    .select('attachment_id')
    .eq('letter_id', letterId)
  
  // Получаем связи писем
  const { data: parentLinks } = await supabase
    .from('letter_links')
    .select('parent_id')
    .eq('child_id', letterId)
  
  const { data: childLinks } = await supabase
    .from('letter_links')
    .select('child_id')
    .eq('parent_id', letterId)

  // Формируем YAML frontmatter (идентично AttachmentRecognitionModal)
  let yamlFrontmatter = '---\n'
  
  if (fullLetter) {
    yamlFrontmatter += `id: ${fullLetter.id}\n`
    
    if (fullLetter.number) {
      yamlFrontmatter += `номер_письма_от_контрагента: "${fullLetter.number}"\n`
    }
    
    if (fullLetter.reg_number) {
      yamlFrontmatter += `регистрационный_номер_письма: "${fullLetter.reg_number}"\n`
    }
    
    if (projectName) {
      yamlFrontmatter += `проект: ${projectName}\n`
    }
    
    if (fullLetter.letter_date) {
      yamlFrontmatter += `дата_письма: ${fullLetter.letter_date}\n`
    }
    
    if (fullLetter.subject) {
      yamlFrontmatter += `тема: "${fullLetter.subject}"\n`
    }
    
    yamlFrontmatter += `направление: ${fullLetter.direction === 'incoming' ? 'входящее' : 'исходящее'}\n`
    
    if (fullLetter.reg_date) {
      yamlFrontmatter += `дата_регистрации: ${fullLetter.reg_date}\n`
    }
    
    if (creatorName) {
      yamlFrontmatter += `создал: ${creatorName}\n`
    }
    
    if (fullLetter.created_at) {
      yamlFrontmatter += `создано: ${fullLetter.created_at}\n`
    }
    
    if (fullLetter.delivery_method) {
      yamlFrontmatter += `метод_доставки: "${fullLetter.delivery_method}"\n`
    }
    
    if (fullLetter.responsible_person_name) {
      yamlFrontmatter += `ответственный: ${fullLetter.responsible_person_name}\n`
    }
    
    if (senderName) {
      yamlFrontmatter += `отправитель: ${senderName}\n`
    } else if (fullLetter.sender) {
      yamlFrontmatter += `отправитель: "${fullLetter.sender}"\n`
    }
    
    if (recipientName) {
      yamlFrontmatter += `получатель: ${recipientName}\n`
    } else if (fullLetter.recipient) {
      yamlFrontmatter += `получатель: "${fullLetter.recipient}"\n`
    }
    
    if (letterAttachments && letterAttachments.length > 0) {
      const attachmentIds = letterAttachments.map(la => la.attachment_id)
      const { data: attachments } = await supabase
        .from('attachments')
        .select('original_name, mime_type')
        .in('id', attachmentIds)
      
      if (attachments && attachments.length > 0) {
        // Фильтруем markdown файлы
        const filteredAttachments = attachments.filter(att => 
          !att.mime_type?.includes('markdown') && !att.original_name.endsWith('.md')
        )
        
        if (filteredAttachments.length > 0) {
          yamlFrontmatter += `вложения:\n`
          filteredAttachments.forEach(att => {
            yamlFrontmatter += `  - "${att.original_name}"\n`
          })
        }
      }
    }
    
    if (parentLinks && parentLinks.length > 0) {
      yamlFrontmatter += `родительские_письма:\n`
      parentLinks.forEach(link => {
        yamlFrontmatter += `  - ${link.parent_id}\n`
      })
    }
    
    if (childLinks && childLinks.length > 0) {
      yamlFrontmatter += `дочерние_письма:\n`
      childLinks.forEach(link => {
        yamlFrontmatter += `  - ${link.child_id}\n`
      })
    }
  }
  
  yamlFrontmatter += '---\n'
  
  return yamlFrontmatter
}

