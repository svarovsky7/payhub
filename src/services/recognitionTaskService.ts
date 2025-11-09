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

const STORAGE_KEY = 'recognition_tasks'
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

  const baseName = task.attachmentName.replace(/\.[^/.]+$/, '')
  const displayFileName = `${baseName}_распознано.md`
  const blob = new Blob([task.markdown], { type: 'text/markdown' })
  
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

