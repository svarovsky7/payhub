import { supabase } from '../lib/supabase'
import { datalabService } from './datalabService'
import { createRecognitionLink, getRecognizedAttachmentId } from './attachmentRecognitionService'

export interface RecognitionTask {
  id: string
  attachmentId: string
  attachmentName: string
  letterId: string
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  markdown?: string
  error?: string
  startedAt: number
}

const tasks = new Map<string, RecognitionTask>()
const listeners = new Set<() => void>()

function notifyListeners() {
  console.log(`[recognitionTaskService] 📢 Notifying ${listeners.size} listeners, current tasks:`, getTasks().map(t => ({ id: t.id, letterId: t.letterId, status: t.status })))
  listeners.forEach(fn => fn())
}

export function subscribeToTasks(callback: () => void) {
  listeners.add(callback)
  return () => { listeners.delete(callback) }
}

export function getTasks(): RecognitionTask[] {
  return Array.from(tasks.values())
}

export function getTaskByAttachmentId(attachmentId: string): RecognitionTask | undefined {
  return Array.from(tasks.values()).find(t => t.attachmentId === attachmentId)
}

export function getTaskProgress(attachmentId: string): number {
  const task = getTaskByAttachmentId(attachmentId)
  return task?.progress || 0
}

export function getTasksByLetterId(letterId: string): RecognitionTask[] {
  return Array.from(tasks.values()).filter(t => t.letterId === letterId && t.status === 'processing')
}

async function processTasks() {
  const pendingTasks = Array.from(tasks.values()).filter(t => t.status === 'processing')
  
  for (const task of pendingTasks) {
    // Обновляем прогресс на основе времени (примерная оценка)
    const elapsed = Date.now() - task.startedAt
    const estimatedDuration = 60000 // 60 секунд примерно
    task.progress = Math.min(95, Math.floor((elapsed / estimatedDuration) * 100))
    
    console.log(`⏳ Проверка статуса задачи ${task.taskId} (${task.attachmentName}), прогресс: ${task.progress}%`)
    
    try {
      const statusCheck = await datalabService.checkMarkerStatus(task.taskId)
      
      if (statusCheck.isReady && statusCheck.markdown) {
        // Распознавание завершено
        task.status = 'completed'
        task.progress = 100
        task.markdown = statusCheck.markdown
        
        console.log(`✅ Распознавание завершено для ${task.attachmentName}`)
        
        // Сохраняем файл
        await saveRecognizedFile(task)
        
        console.log(`💾 Файл ${task.attachmentName} успешно сохранен в БД и storage`)
        
        // Удаляем задачу из списка
        tasks.delete(task.id)
        notifyListeners()
      } else {
        // Результат еще не готов, просто обновляем прогресс
        console.log(`⏸️ Результат еще не готов для ${task.attachmentName}, статус: ${statusCheck.status}`)
        notifyListeners()
      }
    } catch (error: any) {
      console.error(`❌ Критическая ошибка распознавания ${task.attachmentName}:`, error)
      task.status = 'failed'
      task.error = error.message
      tasks.delete(task.id)
      notifyListeners()
    }
  }
  
  // Если есть активные задачи, продолжаем проверку
  if (tasks.size > 0) {
    setTimeout(processTasks, 5000)
  }
}

async function saveRecognizedFile(task: RecognitionTask) {
  if (!task.markdown) return
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Пользователь не авторизован')

  // Получаем полную информацию о письме
  const { data: letter } = await supabase
    .from('letters')
    .select('*')
    .eq('id', task.letterId)
    .single()

  // Загружаем связанные данные отдельно
  let projectName = ''
  let creatorName = ''
  let senderName = ''
  let recipientName = ''
  
  if (letter?.project_id) {
    const { data: proj } = await supabase.from('projects').select('name').eq('id', letter.project_id).single()
    projectName = proj?.name || ''
  }
  
  if (letter?.created_by) {
    const { data: creator } = await supabase.from('user_profiles').select('full_name').eq('id', letter.created_by).single()
    creatorName = creator?.full_name || ''
  }
  
  if (letter?.sender_type === 'contractor' && letter?.sender_contractor_id) {
    const { data: sender } = await supabase.from('contractors').select('name').eq('id', letter.sender_contractor_id).single()
    senderName = sender?.name || ''
  }
  
  if (letter?.recipient_type === 'contractor' && letter?.recipient_contractor_id) {
    const { data: recipient } = await supabase.from('contractors').select('name').eq('id', letter.recipient_contractor_id).single()
    recipientName = recipient?.name || ''
  }

  // Получаем публичные ссылки
  const { data: publicShares } = await supabase
    .from('letter_public_shares')
    .select('token')
    .eq('letter_id', task.letterId)

  // Получаем вложения письма
  const { data: letterAttachments } = await supabase
    .from('letter_attachments')
    .select('attachment_id')
    .eq('letter_id', task.letterId)
  
  // Получаем связи писем
  const { data: parentLinks } = await supabase
    .from('letter_links')
    .select('parent_id')
    .eq('child_id', task.letterId)
  
  const { data: childLinks } = await supabase
    .from('letter_links')
    .select('child_id')
    .eq('parent_id', task.letterId)

  // Формируем YAML frontmatter
  let yamlFrontmatter = '---\n'
  
  if (letter) {
    // 1. ID письма
    yamlFrontmatter += `id: ${letter.id}\n`
    
    // 2. Номер письма от контрагента
    if (letter.number) {
      yamlFrontmatter += `номер_письма_от_контрагента: "${letter.number}"\n`
    }
    
    // 3. Регистрационный номер письма
    if (letter.reg_number) {
      yamlFrontmatter += `регистрационный_номер_письма: "${letter.reg_number}"\n`
    }
    
    // 4. Проект
    if (projectName) {
      yamlFrontmatter += `проект: ${projectName}\n`
    }
    
    // 5. Дата письма
    if (letter.letter_date) {
      yamlFrontmatter += `дата_письма: ${letter.letter_date}\n`
    }
    
    // 6. Тема
    if (letter.subject) {
      yamlFrontmatter += `тема: "${letter.subject}"\n`
    }
    
    // 7. Направление
    yamlFrontmatter += `направление: ${letter.direction === 'incoming' ? 'входящее' : 'исходящее'}\n`
    
    // 8. Дата регистрации
    if (letter.reg_date) {
      yamlFrontmatter += `дата_регистрации: ${letter.reg_date}\n`
    }
    
    // 9. Кто внес письмо
    if (creatorName) {
      yamlFrontmatter += `создал: ${creatorName}\n`
    }
    
    // 10. Когда внесли письмо
    if (letter.created_at) {
      yamlFrontmatter += `создано: ${letter.created_at}\n`
    }
    
    // 11. Метод доставки
    if (letter.delivery_method) {
      yamlFrontmatter += `метод_доставки: "${letter.delivery_method}"\n`
    }
    
    // 12. Ответственный сотрудник
    if (letter.responsible_person_name) {
      yamlFrontmatter += `ответственный: ${letter.responsible_person_name}\n`
    }
    
    // 13. Отправитель
    if (senderName) {
      yamlFrontmatter += `отправитель: ${senderName}\n`
    } else if (letter.sender) {
      yamlFrontmatter += `отправитель: "${letter.sender}"\n`
    }
    
    // 14. Получатель
    if (recipientName) {
      yamlFrontmatter += `получатель: ${recipientName}\n`
    } else if (letter.recipient) {
      yamlFrontmatter += `получатель: "${letter.recipient}"\n`
    }
    
    // 15. Вложения
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
    
    // 16. Связанные письма
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
  
  yamlFrontmatter += '---\n\n'

  console.log('🔖 Generated YAML frontmatter:', yamlFrontmatter)

  // Объединяем YAML frontmatter с markdown
  const markdownWithMetadata = yamlFrontmatter + task.markdown

  const baseName = task.attachmentName.replace(/\.[^/.]+$/, '')
  const displayFileName = `${baseName}_распознано.md`
  const blob = new Blob([markdownWithMetadata], { type: 'text/markdown' })
  
  const sanitizedName = baseName.replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_')
  const storagePath = `letters/${task.letterId}/${Date.now()}_recognized.md`
  const file = new File([blob], sanitizedName + '_recognized.md')
  
  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(storagePath, file)

  if (uploadError) throw uploadError

  const { data: newAttachment, error: dbError } = await supabase
    .from('attachments')
    .insert({
      original_name: displayFileName,
      storage_path: storagePath,
      size_bytes: blob.size,
      mime_type: 'text/markdown',
      description: `Распознанный текст из ${task.attachmentName}`,
      created_by: user.id
    })
    .select()
    .single()
  
  if (dbError) throw dbError
  if (!newAttachment) throw new Error('Не удалось создать запись о вложении')

  const { error: linkError } = await supabase
    .from('letter_attachments')
    .insert({
      letter_id: task.letterId,
      attachment_id: newAttachment.id
    })

  if (linkError) throw linkError

  // Проверяем, есть ли уже связь распознавания
  const existingRecognitionId = await getRecognizedAttachmentId(task.attachmentId)
  
  if (existingRecognitionId) {
    // Обновляем существующую связь
    const { error: updateError } = await supabase
      .from('attachment_recognitions')
      .update({ 
        recognized_attachment_id: newAttachment.id,
        created_by: user.id
      })
      .eq('original_attachment_id', task.attachmentId)

    if (updateError) throw updateError
    
    // Удаляем старый распознанный файл из letter_attachments
    await supabase
      .from('letter_attachments')
      .delete()
      .eq('attachment_id', existingRecognitionId)
    
    // Удаляем старый файл из storage
    const { data: oldAttachment } = await supabase
      .from('attachments')
      .select('storage_path')
      .eq('id', existingRecognitionId)
      .single()

    if (oldAttachment) {
      await supabase.storage.from('attachments').remove([oldAttachment.storage_path])
    }
    
    // Удаляем запись о старом файле
    await supabase.from('attachments').delete().eq('id', existingRecognitionId)
  } else {
    // Создаем новую связь
    await createRecognitionLink(task.attachmentId, newAttachment.id, user.id)
  }
  
  console.log('Файл сохранен:', {
    storagePath,
    attachmentId: newAttachment.id,
    letterId: task.letterId,
    originalAttachmentId: task.attachmentId,
    isUpdate: !!existingRecognitionId
  })
}

export async function startRecognitionTask(
  attachmentId: string,
  attachmentName: string,
  letterId: string,
  fileUrl: string,
  options?: {
    pageRange?: { start: number; end: number }
    maxPages?: number
  }
): Promise<void> {
  // Проверяем, нет ли уже задачи для этого вложения
  if (getTaskByAttachmentId(attachmentId)) {
    throw new Error('Распознавание уже запущено для этого файла')
  }

  console.log(`🚀 Запуск распознавания для ${attachmentName}`)
  
  // Запускаем распознавание
  const taskId = await datalabService.requestMarker(fileUrl, options)
  
  console.log(`📝 Получен taskId: ${taskId}`)
  
  const task: RecognitionTask = {
    id: `${attachmentId}_${Date.now()}`,
    attachmentId,
    attachmentName,
    letterId,
    taskId,
    status: 'processing',
    progress: 0,
    startedAt: Date.now()
  }
  
  tasks.set(task.id, task)
  notifyListeners()
  
  // Запускаем обработку, если еще не запущена
  if (tasks.size === 1) {
    processTasks()
  }
}

export function cancelTask(taskId: string) {
  tasks.delete(taskId)
  notifyListeners()
}

