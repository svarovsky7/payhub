import { Modal, Button, Space, Spin, message } from 'antd'
import { ScanOutlined, ReloadOutlined, SaveOutlined, EditOutlined } from '@ant-design/icons'
import { useState, useEffect, useRef } from 'react'
import { getRecognizedMarkdown } from '../../services/attachmentRecognitionService'
import { startRecognitionTask, subscribeToTasks, getTaskByAttachmentId, getTaskProgress, getTasks } from '../../services/recognitionTaskService'
import type { Letter } from '../../lib/supabase'
import { AttachmentsList } from './AttachmentsList'
import { RecognitionEditor } from './RecognitionEditor'
import { RecognitionPreview } from './RecognitionPreview'
import { PdfCropModal } from '../common/PdfCropModal'
import { truncateText } from '../../utils/textUtils'
import { usePageConfigs } from '../../hooks/usePageConfigs'
import { useYamlGenerator } from '../../hooks/useYamlGenerator'
import { useAttachmentSaver } from '../../hooks/useAttachmentSaver'
import { useAttachmentLoader } from '../../hooks/useAttachmentLoader'

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
  const [processing, setProcessing] = useState(false)
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null)
  const [previewMode, setPreviewMode] = useState(false)
  const [pageRange, setPageRange] = useState<PageRange>({ start: 1, end: 1 })
  const [allPages, setAllPages] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [currentMarkdown, setCurrentMarkdown] = useState('')
  const [originalMarkdown, setOriginalMarkdown] = useState('')
  const [cropModalVisible, setCropModalVisible] = useState(false)
  const prevTaskRef = useRef<string | null>(null)
  const prevLetterTasksRef = useRef<Set<string>>(new Set())
  
  const pageConfigsHook = usePageConfigs()
  const { generateYaml } = useYamlGenerator()
  const { saveMarkdownAttachment } = useAttachmentSaver()
  const attachmentLoader = useAttachmentLoader()

  useEffect(() => {
    if (visible && letter) {
      attachmentLoader.loadAttachments(letter.id, selectedAttachment?.id)
    } else {
      attachmentLoader.setAttachments([])
      setSelectedAttachment(null)
      setPreviewMode(false)
      setEditMode(false)
      setCurrentMarkdown('')
      setOriginalMarkdown('')
      setPageRange({ start: 1, end: 1 })
      setAllPages(true)
      pageConfigsHook.setPageConfigs([])
      pageConfigsHook.setSelectedPageRow(null)
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
        if (letter) {
          await attachmentLoader.loadAttachments(letter.id, selectedAttachment?.id)
        }
      }
      
      // Если вложение было в процессе распознавания и задача завершилась (исчезла)
      if (selectedAttachment && taskJustCompleted) {
        // Загружаем markdown из БД
        const markdown = await getRecognizedMarkdown(selectedAttachment.id)
        if (markdown) {
          setCurrentMarkdown(markdown)
          setOriginalMarkdown(markdown)
          pageConfigsHook.setPageConfigs(pageConfigsHook.extractPageConfigsFromMarkdown(markdown))
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


  const handlePageDescriptionChange = (pageNumber: number, description: string) => {
    const updatedConfigs = pageConfigsHook.handlePageDescriptionChange(pageNumber, description)
    const updatedMarkdown = pageConfigsHook.updateMarkdownWithPageConfigs(currentMarkdown, updatedConfigs)
    setCurrentMarkdown(updatedMarkdown)
  }

  const handleContinuationChange = (pageNumber: number, checked: boolean) => {
    const updatedConfigs = pageConfigsHook.handleContinuationChange(pageNumber, checked)
    const updatedMarkdown = pageConfigsHook.updateMarkdownWithPageConfigs(currentMarkdown, updatedConfigs)
    setCurrentMarkdown(updatedMarkdown)
  }

  const handleSelectAttachment = async (attachment: Attachment) => {
    const isDifferentAttachment = selectedAttachment?.id !== attachment.id
    if (isDifferentAttachment) {
      pageConfigsHook.setPageConfigs([])
    }
    
    setSelectedAttachment(attachment)
    setPageRange({ start: 1, end: 1 })
    setAllPages(true)
    
    const task = getTaskByAttachmentId(attachment.id)
    prevTaskRef.current = task ? attachment.id : null
    
    if (attachment.recognized) {
      try {
        const markdown = await getRecognizedMarkdown(attachment.id)
        if (markdown) {
          setCurrentMarkdown(markdown)
          setOriginalMarkdown(markdown)
          pageConfigsHook.setPageConfigs(pageConfigsHook.extractPageConfigsFromMarkdown(markdown))
          setEditMode(true)
          setPreviewMode(false)
        } else {
          setPreviewMode(true)
          setEditMode(false)
        }
      } catch (error) {
        console.error('Ошибка загрузки markdown:', error)
        message.error('Не удалось загрузить распознанный текст')
        setPreviewMode(true)
        setEditMode(false)
      }
    } else {
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
      const options = allPages 
        ? { pageConfigs: pageConfigsHook.pageConfigs.length > 0 ? pageConfigsHook.pageConfigs : undefined } 
        : { pageRange, pageConfigs: pageConfigsHook.pageConfigs.length > 0 ? pageConfigsHook.pageConfigs : undefined }
      
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
      
      if (letter) {
        await attachmentLoader.loadAttachments(letter.id, selectedAttachment.id)
      }
    } catch (error: any) {
      message.error(error.message || 'Ошибка запуска распознавания')
      console.error(error)
    } finally {
      setProcessing(false)
    }
  }

  const handleSaveChanges = async () => {
    if (!letter || !selectedAttachment || !currentMarkdown) return

    attachmentLoader.setAttachments(prev => prev.map(a => 
      a.id === selectedAttachment.id ? { ...a, recognized: true } : a
    ))
    
    try {
      const yamlMarkdown = await generateYaml({ letterId: letter.id, markdown: currentMarkdown })
      
      await saveMarkdownAttachment({
        letterId: letter.id,
        attachmentId: selectedAttachment.id,
        attachmentName: selectedAttachment.original_name,
        markdown: yamlMarkdown
      })

      setOriginalMarkdown(currentMarkdown)
      await attachmentLoader.loadAttachments(letter.id, selectedAttachment.id)
      onSuccess?.()
    } catch (error) {
      message.error('Ошибка сохранения')
      console.error(error)
    }
  }

  const handleCropSuccess = async () => {
    setCropModalVisible(false)
    message.success('Обрезанный документ сохранен')
    if (letter) {
      await attachmentLoader.loadAttachments(letter.id, selectedAttachment?.id)
    }
    onSuccess?.()
  }

  const handleInsertYaml = async () => {
    if (!letter || !currentMarkdown) return

    try {
      const markdownWithMetadata = await generateYaml({
        letterId: letter.id,
        markdown: currentMarkdown
      })
      setCurrentMarkdown(markdownWithMetadata)
      message.success('YAML блок добавлен')
    } catch (error) {
      message.error('Ошибка добавления YAML блока')
      console.error(error)
    }
  }

  const renderAttachmentList = () => (
    <AttachmentsList
      attachments={attachmentLoader.attachments}
      onSelectAttachment={handleSelectAttachment}
    />
  )

  const renderEditor = () => (
    <RecognitionEditor
      attachmentUrl={selectedAttachment?.url}
      attachmentMimeType={selectedAttachment?.mime_type || ''}
      markdown={currentMarkdown}
      onMarkdownChange={setCurrentMarkdown}
      pageConfigs={pageConfigsHook.pageConfigs}
      selectedPageRow={pageConfigsHook.selectedPageRow}
      onSelectRow={pageConfigsHook.setSelectedPageRow}
      onPageDescriptionChange={handlePageDescriptionChange}
      onContinuationChange={handleContinuationChange}
    />
  )

  const renderPreview = () => (
    <RecognitionPreview
      attachmentUrl={selectedAttachment?.url}
      attachmentMimeType={selectedAttachment?.mime_type || ''}
      allPages={allPages}
      pageRange={pageRange}
      onAllPagesChange={setAllPages}
      onPageRangeChange={setPageRange}
      pageConfigs={pageConfigsHook.pageConfigs}
      onPageConfigsChange={pageConfigsHook.setPageConfigs}
    />
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
                disabled={!currentMarkdown}
              >
                Вставить YAML данные
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSaveChanges}
                disabled={currentMarkdown === originalMarkdown || !currentMarkdown.trim()}
              >
                Сохранить изменения
              </Button>
            </>
          )}
        </Space>
      }
    >
      <Spin spinning={attachmentLoader.loading || processing} tip={processing ? 'Запуск распознавания...' : 'Загрузка...'}>
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
