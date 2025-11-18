import { Modal, Button, Space, Spin, message, List, Row, Col } from 'antd'
import { ScanOutlined, ReloadOutlined, SaveOutlined, EditOutlined } from '@ant-design/icons'
import { useState, useEffect, useRef } from 'react'
import { getLetterAttachments } from '../../services/letter/letterFiles'
import { supabase } from '../../lib/supabase'
import { getRecognitionStatuses, getRecognizedMarkdown, getRecognizedAttachmentId } from '../../services/attachmentRecognitionService'
import { startRecognitionTask, subscribeToTasks, getTaskByAttachmentId, getTaskProgress, getTasks } from '../../services/recognitionTaskService'
import { createAuditLogEntry } from '../../services/auditLogService'
import type { Letter } from '../../lib/supabase'
import { AttachmentCard } from './AttachmentCard'
import { AttachmentPreview } from './AttachmentPreview'
import { RecognitionSettings, type PageConfig } from './RecognitionSettings'
import { MarkdownEditor } from './MarkdownEditor'
import { PdfCropModal } from './PdfCropModal'
import { truncateText } from '../../utils/textUtils'

interface AttachmentRecognitionModalProps {
  visible: boolean
  letter: Letter | null
  onCancel: () => void
  onSuccess?: () => void
}

interface Attachment {
  id: string
  original_name: string
  storage_path: string
  mime_type: string
  url?: string
  recognized?: boolean
  recognizing?: boolean
  progress?: number
}

interface PageRange {
  start: number
  end: number
}

const isPdf = (mimeType: string) => mimeType === 'application/pdf'

export const AttachmentRecognitionModal = ({
  visible,
  letter,
  onCancel,
  onSuccess
}: AttachmentRecognitionModalProps) => {
  const [loading, setLoading] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [processing, setProcessing] = useState(false)
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [pageRange, setPageRange] = useState<PageRange>({ start: 1, end: 1 })
  const [allPages, setAllPages] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [currentMarkdown, setCurrentMarkdown] = useState('')
  const [originalMarkdown, setOriginalMarkdown] = useState('')
  const [cropModalVisible, setCropModalVisible] = useState(false)
  const [pageConfigs, setPageConfigs] = useState<PageConfig[]>([])
  const prevTaskRef = useRef<string | null>(null)
  const prevLetterTasksRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (visible && letter) {
      loadAttachments()
    } else {
      setAttachments([])
      setSelectedAttachment(null)
      setPreviewMode(false)
      setEditMode(false)
      setCurrentMarkdown('')
      setOriginalMarkdown('')
      setPageRange({ start: 1, end: 1 })
      setAllPages(true)
      setPageConfigs([]) // Сбрасываем pageConfigs при закрытии модального окна
      setCropModalVisible(false)
      prevTaskRef.current = null
      prevLetterTasksRef.current = new Set()
    }
  }, [visible, letter])

  useEffect(() => {
    if (!letter) return undefined
    
    // Подписываемся на обновления задач распознавания
    const unsubscribe = subscribeToTasks(async () => {
      const currentTask = selectedAttachment ? getTaskByAttachmentId(selectedAttachment.id) : null
      const wasProcessing = prevTaskRef.current === selectedAttachment?.id
      
      // Проверяем, есть ли задачи для ТЕКУЩЕГО письма
      const letterTasks = getTasks().filter(t => t.letterId === letter.id)
      const taskJustCompleted = wasProcessing && !currentTask
      const hasActiveTask = letterTasks.some(t => t.status === 'processing')
      
      // Обновляем ref текущим состоянием
      prevTaskRef.current = currentTask ? selectedAttachment?.id || null : null
      
      // Обновляем только статусы без перезагрузки URL (чтобы не перезагружать PDF)
      if (hasActiveTask && !taskJustCompleted) {
        setAttachments(prev => prev.map(att => {
          const task = getTaskByAttachmentId(att.id)
          return {
            ...att,
            recognizing: !!task,
            progress: task ? getTaskProgress(att.id) : att.progress || 0
          }
        }))
        if (selectedAttachment) {
          const task = getTaskByAttachmentId(selectedAttachment.id)
          if (task) {
            setSelectedAttachment(prev => prev ? {
              ...prev,
              recognizing: true,
              progress: getTaskProgress(prev.id)
            } : null)
          }
        }
      } else if (taskJustCompleted || !hasActiveTask) {
        // Полная перезагрузка только после завершения
        await loadAttachments()
      }
      
      // Если вложение было в процессе распознавания и задача завершилась (исчезла)
      if (selectedAttachment && taskJustCompleted) {
        // Загружаем markdown из БД
        const markdown = await getRecognizedMarkdown(selectedAttachment.id)
        if (markdown) {
          setCurrentMarkdown(markdown)
          setOriginalMarkdown(markdown)
          setEditMode(true)
          setPreviewMode(false)
        }
      }
    })
    return unsubscribe
  }, [selectedAttachment, letter])
  
  // Отдельная подписка для отслеживания завершения задач письма
  useEffect(() => {
    if (!letter) {
      console.log('[AttachmentRecognitionModal] No letter, skipping task subscription')
      return
    }
    
    console.log('[AttachmentRecognitionModal] Setting up task subscription for letter:', letter.id)
    
    const unsubscribe = subscribeToTasks(() => {
      const letterTasks = getTasks().filter(t => t.letterId === letter.id)
      const currentTaskIds = new Set(letterTasks.map(t => t.id))
      
      console.log('[AttachmentRecognitionModal] Task update for letter', {
        letterId: letter.id,
        prevTaskIds: Array.from(prevLetterTasksRef.current),
        currentTaskIds: Array.from(currentTaskIds),
        letterTasksCount: letterTasks.length
      })
      
      // Проверяем, завершилась ли какая-то задача (исчезла из списка)
      const hasCompletedTask = Array.from(prevLetterTasksRef.current).some(
        taskId => !currentTaskIds.has(taskId)
      )
      
      console.log('[AttachmentRecognitionModal] Completed task check:', {
        hasCompletedTask,
        willCallOnSuccess: hasCompletedTask && !!onSuccess
      })
      
      if (hasCompletedTask) {
        console.log('[AttachmentRecognitionModal] 🎉 Task completed! Calling onSuccess()')
        onSuccess?.()
      }
      
      prevLetterTasksRef.current = currentTaskIds
    })
    
    return () => {
      console.log('[AttachmentRecognitionModal] Cleaning up task subscription for letter:', letter.id)
      unsubscribe()
    }
  }, [letter, onSuccess])

  const loadAttachments = async () => {
    if (!letter) return

    setLoading(true)
    try {
      const data = await getLetterAttachments(letter.id)
      
      const attachmentsWithUrls = await Promise.all(
        data.map(async (item: any) => {
          const att = item.attachments
          if (!att) return null

          const { data: urlData } = await supabase.storage
            .from('attachments')
            .createSignedUrl(att.storage_path, 3600)

          return {
            id: att.id,
            original_name: att.original_name,
            storage_path: att.storage_path,
            mime_type: att.mime_type,
            url: urlData?.signedUrl,
            recognized: false
          }
        })
      )

      const filtered = attachmentsWithUrls.filter(Boolean) as Attachment[]
      
      // Проверяем статусы распознавания
      const ids = filtered.map(a => a.id)
      const statuses = await getRecognitionStatuses(ids)
      
      filtered.forEach(att => {
        att.recognized = statuses[att.id] || false
        const task = getTaskByAttachmentId(att.id)
        att.recognizing = !!task
        att.progress = task ? getTaskProgress(att.id) : 0
      })

      setAttachments(filtered)
      
      // Обновляем selectedAttachment, если оно было выбрано
      if (selectedAttachment) {
        const updated = filtered.find(a => a.id === selectedAttachment.id)
        if (updated) {
          setSelectedAttachment(updated)
        }
      }
    } catch (error) {
      message.error('Ошибка загрузки вложений')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAttachment = async (attachment: Attachment) => {
    // Сбрасываем pageConfigs только при выборе ДРУГОГО вложения
    const isDifferentAttachment = selectedAttachment?.id !== attachment.id
    if (isDifferentAttachment) {
      setPageConfigs([])
    }
    
    setSelectedAttachment(attachment)
    setPageRange({ start: 1, end: 1 })
    setAllPages(true)
    
    // Обновляем ref для отслеживания задачи
    const task = getTaskByAttachmentId(attachment.id)
    prevTaskRef.current = task ? attachment.id : null
    
    // Если файл уже распознан, загружаем markdown
    if (attachment.recognized) {
      setLoading(true)
      try {
        const markdown = await getRecognizedMarkdown(attachment.id)
        if (markdown) {
          setCurrentMarkdown(markdown)
          setOriginalMarkdown(markdown)
          setEditMode(true)
          setPreviewMode(false)
        } else {
          // Файл помечен как распознанный, но markdown не найден
          setPreviewMode(true)
          setEditMode(false)
        }
      } catch (error) {
        console.error('Ошибка загрузки markdown:', error)
        message.error('Не удалось загрузить распознанный текст')
        setPreviewMode(true)
        setEditMode(false)
      } finally {
        setLoading(false)
      }
    } else {
      // Файл не распознан - показываем предпросмотр
      setPreviewMode(true)
      setEditMode(false)
    }
  }

  const handleMarkup = async () => {
    if (!selectedAttachment || !selectedAttachment.url || !letter) {
      message.warning('Выберите вложение для распознавания')
      return
    }

    setProcessing(true)
    try {
      const fileName = selectedAttachment.original_name
      const pageInfo = allPages 
        ? '' 
        : ` (страницы ${pageRange.start}-${pageRange.end})`
      
      message.info(`Запуск распознавания ${fileName}${pageInfo}...`)
      
      // Передаем ВСЕ конфигурации, обработка произойдет на стороне processMarkdownWithPageConfig
      console.log('[AttachmentRecognitionModal] Starting recognition with configs:', {
        pageConfigs,
        allPages,
        pageRange
      })
      
      const options = allPages 
        ? { pageConfigs: pageConfigs.length > 0 ? pageConfigs : undefined } 
        : { pageRange, pageConfigs: pageConfigs.length > 0 ? pageConfigs : undefined }
      
      await startRecognitionTask(
        selectedAttachment.id,
        selectedAttachment.original_name,
        letter.id,
        selectedAttachment.url,
        options
      )

      // Обновляем ref для отслеживания задачи
      prevTaskRef.current = selectedAttachment.id

      message.success('Распознавание запущено. Можете закрыть окно и продолжить работу или дождаться завершения.')
      
      // Обновляем список вложений, чтобы показать статус
      await loadAttachments()
    } catch (error: any) {
      message.error(error.message || 'Ошибка запуска распознавания')
      console.error(error)
    } finally {
      setProcessing(false)
    }
  }

  const handleSaveChanges = async () => {
    if (!letter || !selectedAttachment || !currentMarkdown) return

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Пользователь не авторизован')

      // Получаем ID старого распознанного файла
      const oldRecognizedId = await getRecognizedAttachmentId(selectedAttachment.id)

      // Получаем полную информацию о письме
      const { data: fullLetter } = await supabase
        .from('letters')
        .select('*')
        .eq('id', letter.id)
        .single()

      // Загружаем связанные данные отдельно
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

      // Получаем публичные ссылки
      const { data: _publicShares } = await supabase
        .from('letter_public_shares')
        .select('token')
        .eq('letter_id', letter.id)

      // Получаем вложения письма
      const { data: letterAttachments } = await supabase
        .from('letter_attachments')
        .select('attachment_id')
        .eq('letter_id', letter.id)
      
      // Получаем связи писем
      const { data: parentLinks } = await supabase
        .from('letter_links')
        .select('parent_id')
        .eq('child_id', letter.id)
      
      const { data: childLinks } = await supabase
        .from('letter_links')
        .select('child_id')
        .eq('parent_id', letter.id)

      // Формируем YAML frontmatter
      let yamlFrontmatter = '---\n'
      
      if (fullLetter) {
        // 1. ID письма
        yamlFrontmatter += `id: ${fullLetter.id}\n`
        
        // 2. Номер письма от контрагента
        if (fullLetter.number) {
          yamlFrontmatter += `номер_письма_от_контрагента: "${fullLetter.number}"\n`
        }
        
        // 3. Регистрационный номер письма
        if (fullLetter.reg_number) {
          yamlFrontmatter += `регистрационный_номер_письма: "${fullLetter.reg_number}"\n`
        }
        
        // 4. Проект
        if (projectName) {
          yamlFrontmatter += `проект: ${projectName}\n`
        }
        
        // 5. Дата письма
        if (fullLetter.letter_date) {
          yamlFrontmatter += `дата_письма: ${fullLetter.letter_date}\n`
        }
        
        // 6. Тема
        if (fullLetter.subject) {
          yamlFrontmatter += `тема: "${fullLetter.subject}"\n`
        }
        
        // 7. Направление
        yamlFrontmatter += `направление: ${fullLetter.direction === 'incoming' ? 'входящее' : 'исходящее'}\n`
        
        // 8. Дата регистрации
        if (fullLetter.reg_date) {
          yamlFrontmatter += `дата_регистрации: ${fullLetter.reg_date}\n`
        }
        
        // 9. Кто внес письмо
        if (creatorName) {
          yamlFrontmatter += `создал: ${creatorName}\n`
        }
        
        // 10. Когда внесли письмо
        if (fullLetter.created_at) {
          yamlFrontmatter += `создано: ${fullLetter.created_at}\n`
        }
        
        // 11. Метод доставки
        if (fullLetter.delivery_method) {
          yamlFrontmatter += `метод_доставки: "${fullLetter.delivery_method}"\n`
        }
        
        // 12. Ответственный сотрудник
        if (fullLetter.responsible_person_name) {
          yamlFrontmatter += `ответственный: ${fullLetter.responsible_person_name}\n`
        }
        
        // 13. Отправитель
        if (senderName) {
          yamlFrontmatter += `отправитель: ${senderName}\n`
        } else if (fullLetter.sender) {
          yamlFrontmatter += `отправитель: "${fullLetter.sender}"\n`
        }
        
        // 14. Получатель
        if (recipientName) {
          yamlFrontmatter += `получатель: ${recipientName}\n`
        } else if (fullLetter.recipient) {
          yamlFrontmatter += `получатель: "${fullLetter.recipient}"\n`
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

      // Проверяем, есть ли уже YAML frontmatter в currentMarkdown
      const hasYamlFrontmatter = currentMarkdown.startsWith('---\n')
      
      // Если YAML уже есть, заменяем его
      let markdownWithMetadata: string
      if (hasYamlFrontmatter) {
        // Находим конец YAML блока
        const endIndex = currentMarkdown.indexOf('\n---\n', 4)
        if (endIndex !== -1) {
          // Заменяем старый YAML на новый
          markdownWithMetadata = yamlFrontmatter + currentMarkdown.substring(endIndex + 5)
        } else {
          // Некорректный формат, добавляем новый YAML
          markdownWithMetadata = yamlFrontmatter + currentMarkdown
        }
      } else {
        // Добавляем YAML в начало
        markdownWithMetadata = yamlFrontmatter + currentMarkdown
      }
      
      const baseName = selectedAttachment.original_name.replace(/\.[^/.]+$/, '')
      const displayFileName = `${baseName}_распознано.md`
      const blob = new Blob([markdownWithMetadata], { type: 'text/markdown' })
      
      const sanitizedName = baseName.replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_')
      const storagePath = `letters/${letter.id}/${Date.now()}_recognized.md`
      const file = new File([blob], sanitizedName + '_recognized.md')
      
      // Загружаем новый файл
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(storagePath, file)

      if (uploadError) throw uploadError

      // Создаем запись о новом файле
      const { data: newAttachment, error: dbError } = await supabase
        .from('attachments')
        .insert({
          original_name: displayFileName,
          storage_path: storagePath,
          size_bytes: blob.size,
          mime_type: 'text/markdown',
          description: `Распознанный текст из ${selectedAttachment.original_name}`,
          created_by: user.id
        })
        .select()
        .single()
      
      if (dbError) throw dbError
      if (!newAttachment) throw new Error('Не удалось создать запись о вложении')

      // Обновляем связь (или создаем новую)
      if (oldRecognizedId) {
        // Обновляем существующую связь
        const { error: updateError } = await supabase
          .from('attachment_recognitions')
          .update({ recognized_attachment_id: newAttachment.id })
          .eq('original_attachment_id', selectedAttachment.id)

        if (updateError) throw updateError

        // Удаляем старый файл из letter_attachments
        await supabase
          .from('letter_attachments')
          .delete()
          .eq('attachment_id', oldRecognizedId)

        // Удаляем старый файл из storage и attachments
        const { data: oldAttachment } = await supabase
          .from('attachments')
          .select('storage_path')
          .eq('id', oldRecognizedId)
          .single()

        if (oldAttachment) {
          await supabase.storage.from('attachments').remove([oldAttachment.storage_path])
        }
        
        await supabase.from('attachments').delete().eq('id', oldRecognizedId)
      } else {
        // Создаем новую связь
        const { error: linkError } = await supabase
          .from('attachment_recognitions')
          .insert({
            original_attachment_id: selectedAttachment.id,
            recognized_attachment_id: newAttachment.id,
            created_by: user.id
          })

        if (linkError) throw linkError
      }

      // Привязываем к письму
      const { error: letterLinkError } = await supabase
        .from('letter_attachments')
        .insert({
          letter_id: letter.id,
          attachment_id: newAttachment.id
        })

      if (letterLinkError) throw letterLinkError

      // Создаем запись в истории письма
      await createAuditLogEntry(
        'letter',
        letter.id,
        'file_add',
        user.id,
        {
          fieldName: 'recognized_attachment',
          newValue: displayFileName,
          metadata: {
            file_id: newAttachment.id,
            file_name: displayFileName,
            file_size: blob.size,
            mime_type: 'text/markdown',
            original_file: selectedAttachment.original_name,
            description: `Распознанный текст из файла "${selectedAttachment.original_name}"`
          }
        }
      )

      message.success('Изменения сохранены')
      setOriginalMarkdown(currentMarkdown)
      await loadAttachments()
      onSuccess?.() // Уведомляем родительский компонент об успешном сохранении
    } catch (error) {
      message.error('Ошибка сохранения')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCropSuccess = async () => {
    setCropModalVisible(false)
    message.success('Обрезанный документ сохранен')
    await loadAttachments()
    onSuccess?.()
  }

  const handleInsertYaml = async () => {
    if (!letter || !currentMarkdown) return

    setLoading(true)
    try {
      // Получаем полную информацию о письме
      const { data: fullLetter } = await supabase
        .from('letters')
        .select('*')
        .eq('id', letter.id)
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
        .eq('letter_id', letter.id)
      
      // Получаем связи писем
      const { data: parentLinks } = await supabase
        .from('letter_links')
        .select('parent_id')
        .eq('child_id', letter.id)
      
      const { data: childLinks } = await supabase
        .from('letter_links')
        .select('child_id')
        .eq('parent_id', letter.id)

      // Формируем YAML frontmatter
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
      
      yamlFrontmatter += '---\n\n'

      // Проверяем, есть ли уже YAML frontmatter
      const hasYamlFrontmatter = currentMarkdown.startsWith('---\n')
      
      let markdownWithMetadata: string
      if (hasYamlFrontmatter) {
        // Заменяем существующий YAML
        const endIndex = currentMarkdown.indexOf('\n---\n', 4)
        if (endIndex !== -1) {
          markdownWithMetadata = yamlFrontmatter + currentMarkdown.substring(endIndex + 5)
        } else {
          markdownWithMetadata = yamlFrontmatter + currentMarkdown
        }
      } else {
        // Добавляем YAML в начало
        markdownWithMetadata = yamlFrontmatter + currentMarkdown
      }

      setCurrentMarkdown(markdownWithMetadata)
      message.success('YAML блок добавлен')
    } catch (error) {
      message.error('Ошибка добавления YAML блока')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const renderAttachmentList = () => (
    <div>
      <h4>Выберите вложение для распознавания:</h4>
      <List
        grid={{ gutter: 16, xs: 2, sm: 3, md: 4, lg: 5, xl: 6, xxl: 6 }}
        dataSource={attachments.filter(att => !att.mime_type.includes('markdown'))}
        renderItem={(att) => (
          <List.Item>
            <AttachmentCard
              id={att.id}
              originalName={att.original_name}
              mimeType={att.mime_type}
              url={att.url}
              recognized={att.recognized}
              recognizing={att.recognizing}
              progress={att.progress}
              onClick={() => handleSelectAttachment(att)}
            />
          </List.Item>
        )}
      />
    </div>
  )

  const renderEditor = () => (
    <Row gutter={24}>
      <Col span={12}>
        <h4>Предпросмотр исходного файла:</h4>
        <AttachmentPreview 
          url={selectedAttachment?.url}
          mimeType={selectedAttachment?.mime_type || ''}
        />
      </Col>
      <Col span={12}>
        <h4>Распознанный текст (Markdown):</h4>
        <MarkdownEditor value={currentMarkdown} onChange={setCurrentMarkdown} />
      </Col>
    </Row>
  )

  const renderPreview = () => (
    <Row gutter={24}>
      <Col span={12}>
        <h4>Предпросмотр файла:</h4>
        <AttachmentPreview 
          url={selectedAttachment?.url}
          mimeType={selectedAttachment?.mime_type || ''}
        />
      </Col>
      <Col span={12}>
        <h4>Настройки распознавания:</h4>
        <RecognitionSettings
          allPages={allPages}
          pageRange={pageRange}
          onAllPagesChange={setAllPages}
          onPageRangeChange={setPageRange}
          pdfUrl={selectedAttachment?.url}
          pageConfigs={pageConfigs}
          onPageConfigsChange={setPageConfigs}
        />
      </Col>
    </Row>
  )


  return (
    <Modal
      title={
        selectedAttachment 
          ? `Распознавание: ${truncateText(selectedAttachment.original_name, 40)}` 
          : "Распознавание вложений"
      }
      open={visible}
      onCancel={() => {
        if (selectedAttachment) {
          setSelectedAttachment(null)
          setEditMode(false)
          setPreviewMode(false)
        } else {
          onCancel()
        }
      }}
      width={selectedAttachment ? '90vw' : 900}
      style={{ top: 20 }}
      footer={
        <Space>
          <Button 
            onClick={() => {
              if (selectedAttachment) {
                setSelectedAttachment(null)
                setPreviewMode(false)
                setEditMode(false)
                setCurrentMarkdown('')
                setOriginalMarkdown('')
              } else {
                onCancel()
              }
            }}
          >
            {selectedAttachment ? 'К списку вложений' : 'Закрыть'}
          </Button>
          {selectedAttachment && previewMode && (
            <>
              {isPdf(selectedAttachment.mime_type) && (
                <Button
                  icon={<EditOutlined />}
                  onClick={() => setCropModalVisible(true)}
                  disabled={processing || selectedAttachment.recognizing}
                >
                  Разметить вручную
                </Button>
              )}
              <Button
                type="primary"
                icon={<ScanOutlined />}
                onClick={() => handleMarkup()}
                loading={processing || selectedAttachment.recognizing}
                disabled={processing || selectedAttachment.recognizing}
              >
                Распознать
              </Button>
            </>
          )}
          {selectedAttachment && editMode && (
            <>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => handleMarkup()}
                loading={processing}
              >
                Распознать заново
              </Button>
              <Button
                onClick={handleInsertYaml}
                loading={loading}
                disabled={!currentMarkdown}
              >
                Вставить YAML данные
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSaveChanges}
                loading={loading}
                disabled={currentMarkdown === originalMarkdown || !currentMarkdown.trim()}
              >
                Сохранить изменения
              </Button>
            </>
          )}
        </Space>
      }
    >
      <Spin spinning={loading || processing} tip={processing ? 'Запуск распознавания...' : 'Загрузка...'}>
        {!selectedAttachment ? renderAttachmentList() : (editMode ? renderEditor() : renderPreview())}
      </Spin>

      {selectedAttachment && cropModalVisible && letter && (
        <PdfCropModal
          visible={cropModalVisible}
          onCancel={() => setCropModalVisible(false)}
          onSuccess={handleCropSuccess}
          attachmentUrl={selectedAttachment.url || ''}
          fileName={selectedAttachment.original_name}
          letterId={letter.id}
        />
      )}
    </Modal>
  )
}
