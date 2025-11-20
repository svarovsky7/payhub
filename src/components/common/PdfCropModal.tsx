import { Modal, Button, Space, message, Spin } from 'antd'
import { useState, useRef, useEffect } from 'react'
import { ScissorOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import { supabase } from '../../lib/supabase'
import { createAuditLogEntry } from '../../services/auditLogService'
import { FramesList } from './FramesList'
import { PdfCropCanvas } from './PdfCropCanvas'
import { usePdfLoader } from '../../hooks/usePdfLoader'
import { useFrameOperations } from '../../hooks/useFrameOperations'
import { usePdfCropInteraction } from '../../hooks/usePdfCropInteraction'

interface PdfCropModalProps {
  visible: boolean
  onCancel: () => void
  onSuccess: (croppedBlob?: Blob) => void
  attachmentUrl: string
  fileName: string
  letterId?: string
  taskId?: string
}

interface Frame {
  page: number
  x: number
  y: number
  width: number
  height: number
}

export const PdfCropModal = ({
  visible,
  onCancel,
  onSuccess,
  attachmentUrl,
  fileName,
  letterId,
  taskId
}: PdfCropModalProps) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [frames, setFrames] = useState<Frame[]>([])
  const [processing, setProcessing] = useState(false)
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null)
  const [spacePressed, setSpacePressed] = useState(false)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const pdfLoader = usePdfLoader()
  const frameOps = useFrameOperations()
  const interaction = usePdfCropInteraction(
    canvasRef,
    frames,
    setFrames,
    currentPage,
    selectedFrameIndex,
    setSelectedFrameIndex,
    spacePressed
  )

  useEffect(() => {
    if (visible && attachmentUrl) {
      pdfLoader.loadPdfPages(attachmentUrl, fileName)
    } else {
      setFrames([])
      setCurrentPage(1)
      setScale(1)
      setPan({ x: 0, y: 0 })
    }
  }, [visible, attachmentUrl, fileName])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !spacePressed) {
        e.preventDefault()
        setSpacePressed(true)
      }
      if (e.key === 'Delete' && selectedFrameIndex !== null) {
        setFrames(frames.filter((_, i) => i !== selectedFrameIndex))
        setSelectedFrameIndex(null)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setSpacePressed(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [spacePressed, selectedFrameIndex, frames])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setScale(prev => Math.max(0.1, Math.min(5, prev * delta)))
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [])

  const handleCropAndMerge = async () => {
    if (frames.length === 0) {
      message.warning('Отметьте хотя бы одну область')
      return
    }

    setProcessing(true)
    try {
      message.info(`Обрезка ${frames.length} областей...`)

      const formData = new FormData()
      
      pdfLoader.pageBlobs.forEach((blob, index) => {
        formData.append('page_images', blob, `page_${index}.jpg`)
      })
      
      formData.append('frames', JSON.stringify(frames))

      const cropResponse = await fetch('https://pdf.fvds.ru/crop-to-pdf', {
        method: 'POST',
        body: formData
      })

      if (!cropResponse.ok) {
        throw new Error(`Ошибка обрезки PDF: ${cropResponse.status}`)
      }

      const croppedBlob = await cropResponse.blob()

      if (letterId || taskId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Пользователь не авторизован')

        const baseName = fileName.replace(/\.[^/.]+$/, '')
        const storagePath = letterId 
          ? `letters/${letterId}/${Date.now()}_cropped.pdf`
          : `tasks/${taskId}/${Date.now()}_cropped.pdf`
        const file = new File([croppedBlob], `${baseName}_cropped.pdf`, { type: 'application/pdf' })

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(storagePath, file)

        if (uploadError) throw uploadError

        const { data: newAttachment, error: dbError } = await supabase
          .from('attachments')
          .insert({
            original_name: `${baseName}_обрезано.pdf`,
            storage_path: storagePath,
            size_bytes: croppedBlob.size,
            mime_type: 'application/pdf',
            description: `Обрезанный документ из ${fileName}`,
            created_by: user.id
          })
          .select()
          .single()

        if (dbError) throw dbError
        if (!newAttachment) throw new Error('Не удалось создать запись о вложении')

        if (letterId) {
          const { error: letterLinkError } = await supabase
            .from('letter_attachments')
            .insert({
              letter_id: letterId,
              attachment_id: newAttachment.id
            })

          if (letterLinkError) throw letterLinkError

          await createAuditLogEntry(
            'letter',
            letterId,
            'file_add',
            user.id,
            {
              fieldName: 'cropped_attachment',
              newValue: `${baseName}_обрезано.pdf`,
              metadata: {
                file_id: newAttachment.id,
                file_name: `${baseName}_обрезано.pdf`,
                file_size: croppedBlob.size,
                mime_type: 'application/pdf',
                original_file: fileName,
                frames_count: frames.length,
                description: `Обрезанный документ из файла "${fileName}" (${frames.length} областей)`
              }
            }
          )
        }
      }

      message.success('Документ обрезан и сохранен')
      onSuccess(croppedBlob)
    } catch (error: any) {
      console.error('Crop error:', error)
      message.error(error.message || 'Ошибка обрезки документа')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Modal
      title={`Разметка файла: ${fileName}`}
      open={visible}
      onCancel={onCancel}
      width="90vw"
      style={{ top: 20 }}
      footer={
        <Space>
          <Button onClick={onCancel}>Отмена</Button>
          <Button
            type="primary"
            icon={<ScissorOutlined />}
            onClick={handleCropAndMerge}
            loading={processing}
            disabled={frames.length === 0}
          >
            Обрезать и собрать единый файл
          </Button>
        </Space>
      }
    >
      {pdfLoader.loading ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px',
          gap: 16
        }}>
          <Spin size="large" />
          <div>{pdfLoader.loadingText}</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            Это может занять некоторое время для больших файлов
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Space>
              <Button
                icon={<LeftOutlined />}
                onClick={() => currentPage > 1 && setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Предыдущая
              </Button>
              <span>Страница {currentPage} из {pdfLoader.totalPages}</span>
              <Button
                icon={<RightOutlined />}
                onClick={() => currentPage < pdfLoader.totalPages && setCurrentPage(currentPage + 1)}
                disabled={currentPage === pdfLoader.totalPages}
              >
                Следующая
              </Button>
              <Button
                onClick={() => {
                  setFrames(frames.filter(f => f.page !== currentPage - 1))
                  setSelectedFrameIndex(null)
                }}
                disabled={!frames.some(f => f.page === currentPage - 1)}
              >
                Очистить страницу
              </Button>
            </Space>

            <div 
              ref={containerRef}
              style={{ 
                border: '1px solid #d9d9d9', 
                borderRadius: 4, 
                overflow: 'auto', 
                maxHeight: 'calc(90vh - 200px)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#f5f5f5'
              }}
            >
              <PdfCropCanvas
                pageImages={pdfLoader.pageImages}
                currentPage={currentPage}
                frames={frames}
                selectedFrameIndex={selectedFrameIndex}
                currentFrame={interaction.currentFrame}
                drawing={interaction.drawing}
                scale={scale}
                pan={pan}
                isPanning={interaction.isPanning}
                cursor={interaction.getCursor()}
                onMouseDown={interaction.handleMouseDown}
                onMouseMove={interaction.handleMouseMove}
                onMouseUp={interaction.handleMouseUp}
              />
            </div>
          </div>

          <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FramesList
              frames={frames}
              selectedFrameIndex={selectedFrameIndex}
              draggedFrameIndex={frameOps.draggedFrameIndex}
              dragOverIndex={frameOps.dragOverIndex}
              onSelectFrame={(index, page) => {
                setSelectedFrameIndex(index)
                setCurrentPage(page)
              }}
              onMoveUp={(index) => frameOps.moveFrameUp(frames, index, selectedFrameIndex, setFrames, setSelectedFrameIndex)}
              onMoveDown={(index) => frameOps.moveFrameDown(frames, index, selectedFrameIndex, setFrames, setSelectedFrameIndex)}
              onDelete={(index) => frameOps.deleteFrame(frames, index, selectedFrameIndex, setFrames, setSelectedFrameIndex)}
              onDragStart={frameOps.handleDragStart}
              onDragOver={frameOps.handleDragOver}
              onDragLeave={frameOps.handleDragLeave}
              onDrop={(e, dropIndex) => frameOps.handleDrop(e, dropIndex, frames, selectedFrameIndex, setFrames, setSelectedFrameIndex)}
              onDragEnd={frameOps.handleDragEnd}
            />
          </div>
        </div>
      )}
    </Modal>
  )
}
