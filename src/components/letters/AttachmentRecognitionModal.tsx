import { Modal, Button, Space, Spin, message, List, Image, Card, Tooltip, Row, Col, InputNumber, Checkbox, Progress } from 'antd'
import { FileOutlined, ScanOutlined, CheckCircleOutlined, LoadingOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { useState, useEffect, useRef } from 'react'
import { getLetterAttachments } from '../../services/letter/letterFiles'
import { supabase } from '../../lib/supabase'
import { getRecognitionStatuses, getRecognizedMarkdown, getRecognizedAttachmentId } from '../../services/attachmentRecognitionService'
import { startRecognitionTask, subscribeToTasks, getTaskByAttachmentId, getTaskProgress, getTasks } from '../../services/recognitionTaskService'
import { createAuditLogEntry } from '../../services/auditLogService'
import type { Letter } from '../../lib/supabase'

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

const truncateText = (text: string, maxLength: number = 25) => {
  if (!text) return '—'
  if (text.length <= maxLength) return text
  return `${text.substring(0, maxLength)}...`
}

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
      const hasRelevantUpdate = letterTasks.length > 0 || taskJustCompleted
      
      // Обновляем ref текущим состоянием
      prevTaskRef.current = currentTask ? selectedAttachment?.id || null : null
      
      // Загружаем вложения только если есть обновления для текущего письма
      if (hasRelevantUpdate) {
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
    } catch (error) {
      message.error('Ошибка загрузки вложений')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAttachment = async (attachment: Attachment) => {
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
      
      const options = allPages 
        ? undefined 
        : { pageRange }
      
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
      
      const baseName = selectedAttachment.original_name.replace(/\.[^/.]+$/, '')
      const displayFileName = `${baseName}_распознано.md`
      const blob = new Blob([currentMarkdown], { type: 'text/markdown' })
      
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


  const isImage = (mimeType: string) => mimeType.startsWith('image/')
  const isPdf = (mimeType: string) => mimeType === 'application/pdf'

  const renderAttachmentList = () => (
    <div>
      <h4>Выберите вложение для распознавания:</h4>
      <List
        grid={{ gutter: 16, xs: 2, sm: 3, md: 4, lg: 5, xl: 6, xxl: 6 }}
        dataSource={attachments.filter(att => !att.mime_type.includes('markdown'))}
        renderItem={(att) => (
          <List.Item>
            <Card
              hoverable
              onClick={() => !att.recognizing && handleSelectAttachment(att)}
              style={{ 
                cursor: att.recognizing ? 'not-allowed' : 'pointer',
                border: att.recognized ? '2px solid #52c41a' : att.recognizing ? '2px solid #1890ff' : undefined,
                background: att.recognized ? '#f6ffed' : att.recognizing ? '#e6f7ff' : undefined,
                opacity: att.recognizing ? 0.8 : 1
              }}
              cover={
                isImage(att.mime_type) && att.url ? (
                  <div style={{ height: 150, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
                    <Image src={att.url} preview={false} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                ) : isPdf(att.mime_type) && att.url ? (
                  <div style={{ height: 150, overflow: 'hidden', position: 'relative', background: '#fff' }}>
                    <iframe 
                      src={`${att.url}#page=1&view=FitH`}
                      style={{ 
                        width: '100%', 
                        height: '300px',
                        border: 'none',
                        pointerEvents: 'none',
                        transform: 'scale(0.5)',
                        transformOrigin: '0 0'
                      }}
                      title={`Preview ${att.original_name}`}
                    />
                  </div>
                ) : (
                  <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
                    <FileOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
                  </div>
                )
              }
            >
              <Card.Meta
                title={
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Space>
                      <Tooltip title={att.original_name}>{truncateText(att.original_name, 12)}</Tooltip>
                      {att.recognized && (
                        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                      )}
                      {att.recognizing && (
                        <LoadingOutlined style={{ color: '#1890ff', fontSize: 16 }} />
                      )}
                    </Space>
                    {att.recognizing && (
                      <Progress percent={att.progress || 0} size="small" status="active" showInfo={false} />
                    )}
                  </Space>
                }
              />
            </Card>
          </List.Item>
        )}
      />
    </div>
  )

  const renderEditor = () => (
    <Row gutter={24}>
      <Col span={12}>
        <h4>Предпросмотр исходного файла:</h4>
        <div style={{ maxHeight: '60vh', overflow: 'auto', border: '1px solid #d9d9d9', borderRadius: '4px', background: '#fff' }}>
          {selectedAttachment?.url && isImage(selectedAttachment.mime_type) ? (
            <Image src={selectedAttachment.url} style={{ width: '100%' }} />
          ) : selectedAttachment?.url && isPdf(selectedAttachment.mime_type) ? (
            <iframe 
              src={selectedAttachment.url} 
              style={{ width: '100%', height: '60vh', border: 'none' }}
              title="PDF Preview"
            />
          ) : (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <Button href={selectedAttachment?.url} target="_blank" type="link">
                Открыть оригинал
              </Button>
            </div>
          )}
        </div>
      </Col>
      <Col span={12}>
        <h4>Распознанный текст (Markdown):</h4>
        <textarea
          value={currentMarkdown}
          onChange={(e) => setCurrentMarkdown(e.target.value)}
          placeholder="Результат распознавания появится здесь..."
          style={{
            width: '100%',
            height: '60vh',
            fontFamily: 'monospace',
            fontSize: '13px',
            padding: '12px',
            border: '1px solid #d9d9d9',
            borderRadius: '4px',
            resize: 'none'
          }}
        />
      </Col>
    </Row>
  )

  const renderPreview = () => (
    <Row gutter={24}>
      <Col span={12}>
        <h4>Предпросмотр файла:</h4>
        <div style={{ maxHeight: '60vh', overflow: 'auto', border: '1px solid #d9d9d9', borderRadius: '4px', background: '#fff' }}>
          {selectedAttachment?.url && isImage(selectedAttachment.mime_type) ? (
            <Image src={selectedAttachment.url} style={{ width: '100%' }} />
          ) : selectedAttachment?.url && isPdf(selectedAttachment.mime_type) ? (
            <iframe 
              src={selectedAttachment.url} 
              style={{ width: '100%', height: '60vh', border: 'none' }}
              title="PDF Preview"
            />
          ) : (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <FileOutlined style={{ fontSize: 64, color: '#d9d9d9', marginBottom: 16 }} />
              <p>Предпросмотр недоступен для этого типа файла</p>
              <Button href={selectedAttachment?.url} target="_blank" type="link">
                Открыть в новой вкладке
              </Button>
            </div>
          )}
        </div>
      </Col>
      <Col span={12}>
        <h4>Настройки распознавания:</h4>
        <div style={{ padding: '16px', border: '1px solid #d9d9d9', borderRadius: '4px', background: '#fafafa' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <Checkbox 
                checked={allPages} 
                onChange={(e) => setAllPages(e.target.checked)}
              >
                Распознать все страницы
              </Checkbox>
            </div>
            {!allPages && (
              <div>
                <div style={{ marginBottom: 8 }}>Укажите диапазон страниц:</div>
                <Space>
                  <span>От</span>
                  <InputNumber 
                    min={1} 
                    value={pageRange.start}
                    onChange={(val) => setPageRange({ ...pageRange, start: val || 1 })}
                    style={{ width: 80 }}
                  />
                  <span>До</span>
                  <InputNumber 
                    min={pageRange.start} 
                    value={pageRange.end}
                    onChange={(val) => setPageRange({ ...pageRange, end: val || pageRange.start })}
                    style={{ width: 80 }}
                  />
                </Space>
              </div>
            )}
            <div style={{ marginTop: 24, padding: 16, background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 4 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#096dd9' }}>
                <strong>Информация:</strong> После нажатия кнопки "Распознать" содержимое файла будет преобразовано в текстовый формат Markdown. Вы сможете отредактировать результат перед сохранением.
              </p>
            </div>
          </Space>
        </div>
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
            <Button
              type="primary"
              icon={<ScanOutlined />}
              onClick={() => handleMarkup()}
              loading={processing}
            >
              Распознать
            </Button>
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
    </Modal>
  )
}
