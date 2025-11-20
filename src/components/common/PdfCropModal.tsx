import { Modal, Button, Space, message, Spin } from 'antd'
import { useState, useRef, useEffect } from 'react'
import { ScissorOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import { supabase } from '../../lib/supabase'
import { createAuditLogEntry } from '../../services/auditLogService'
import { FramesList } from './FramesList'
import { usePdfLoader } from '../../hooks/usePdfLoader'
import { useFrameOperations } from '../../hooks/useFrameOperations'

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
  const [drawing, setDrawing] = useState(false)
  const [currentFrame, setCurrentFrame] = useState<Frame | null>(null)
  const [processing, setProcessing] = useState(false)
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [spacePressed, setSpacePressed] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const pdfLoader = usePdfLoader()
  const frameOps = useFrameOperations()

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
        setIsPanning(false)
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
    if (pageImages.length > 0 && canvasRef.current) {
      drawCanvas()
    }
  }, [currentPage, frames, pageImages, selectedFrameIndex, currentFrame])

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
  }, [pdfLoader.pageImages])

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas || pdfLoader.pageImages.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      const pageFrames = frames
        .map((f, i) => ({ frame: f, index: i }))
        .filter(({ frame }) => frame.page === currentPage - 1)
      
      pageFrames.forEach(({ frame, index }) => {
        const isSelected = selectedFrameIndex === index
        ctx.strokeStyle = isSelected ? '#52c41a' : '#1890ff'
        ctx.lineWidth = isSelected ? 3 : 2
        ctx.strokeRect(frame.x, frame.y, frame.width, frame.height)
        ctx.fillStyle = isSelected ? 'rgba(82, 196, 26, 0.15)' : 'rgba(24, 144, 255, 0.1)'
        ctx.fillRect(frame.x, frame.y, frame.width, frame.height)
        
        if (isSelected) {
          const handleSize = 16
          ctx.fillStyle = '#52c41a'
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 2
          ctx.fillRect(frame.x - handleSize / 2, frame.y - handleSize / 2, handleSize, handleSize)
          ctx.strokeRect(frame.x - handleSize / 2, frame.y - handleSize / 2, handleSize, handleSize)
          ctx.fillRect(frame.x + frame.width - handleSize / 2, frame.y - handleSize / 2, handleSize, handleSize)
          ctx.strokeRect(frame.x + frame.width - handleSize / 2, frame.y - handleSize / 2, handleSize, handleSize)
          ctx.fillRect(frame.x - handleSize / 2, frame.y + frame.height - handleSize / 2, handleSize, handleSize)
          ctx.strokeRect(frame.x - handleSize / 2, frame.y + frame.height - handleSize / 2, handleSize, handleSize)
          ctx.fillRect(frame.x + frame.width - handleSize / 2, frame.y + frame.height - handleSize / 2, handleSize, handleSize)
          ctx.strokeRect(frame.x + frame.width - handleSize / 2, frame.y + frame.height - handleSize / 2, handleSize, handleSize)
        }
        
        ctx.fillStyle = isSelected ? '#52c41a' : '#1890ff'
        ctx.strokeStyle = '#fff'
        ctx.font = 'bold 20px Arial'
        ctx.lineWidth = 3
        const text = String(index + 1)
        const textX = frame.x + 10
        const textY = frame.y + 25
        ctx.strokeText(text, textX, textY)
        ctx.fillText(text, textX, textY)
      })

      if (currentFrame && drawing) {
        ctx.strokeStyle = '#52c41a'
        ctx.lineWidth = 3
        const w = currentFrame.width
        const h = currentFrame.height
        const x = w < 0 ? currentFrame.x + w : currentFrame.x
        const y = h < 0 ? currentFrame.y + h : currentFrame.y
        ctx.strokeRect(x, y, Math.abs(w), Math.abs(h))
        ctx.fillStyle = 'rgba(82, 196, 26, 0.15)'
        ctx.fillRect(x, y, Math.abs(w), Math.abs(h))
      }
    }
    img.src = pdfLoader.pageImages[currentPage - 1]
  }

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = Math.round((e.clientX - rect.left) * scaleX)
    const y = Math.round((e.clientY - rect.top) * scaleY)
    return { x, y }
  }

  const getResizeHandle = (x: number, y: number, frame: Frame): 'tl' | 'tr' | 'bl' | 'br' | null => {
    const handleSize = 16
    const tolerance = handleSize

    if (Math.abs(x - frame.x) <= tolerance && Math.abs(y - frame.y) <= tolerance) return 'tl'
    if (Math.abs(x - (frame.x + frame.width)) <= tolerance && Math.abs(y - frame.y) <= tolerance) return 'tr'
    if (Math.abs(x - frame.x) <= tolerance && Math.abs(y - (frame.y + frame.height)) <= tolerance) return 'bl'
    if (Math.abs(x - (frame.x + frame.width)) <= tolerance && Math.abs(y - (frame.y + frame.height)) <= tolerance) return 'br'
    return null
  }

  const isPointInFrame = (x: number, y: number, frame: Frame): boolean => {
    return x >= frame.x && x <= frame.x + frame.width &&
           y >= frame.y && y <= frame.y + frame.height
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (spacePressed) {
      setIsPanning(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      return
    }

    const coords = getCanvasCoords(e)
    if (!coords) return

    const { x, y } = coords

    const pageFrames = frames
      .map((f, i) => ({ frame: f, index: i }))
      .filter(({ frame }) => frame.page === currentPage - 1)

    if (selectedFrameIndex !== null) {
      const selectedFrame = frames[selectedFrameIndex]
      if (selectedFrame && selectedFrame.page === currentPage - 1) {
        const handle = getResizeHandle(x, y, selectedFrame)
        if (handle) {
          setResizing(handle)
          setDragStart({ x, y })
          return
        }
      }
    }

    for (let i = pageFrames.length - 1; i >= 0; i--) {
      const { frame, index } = pageFrames[i]
      if (isPointInFrame(x, y, frame)) {
        setSelectedFrameIndex(index)
        setDragging(true)
        setDragStart({ x, y })
        return
      }
    }

    setSelectedFrameIndex(null)
    setDrawing(true)
    setCurrentFrame({
      page: currentPage - 1,
      x,
      y,
      width: 0,
      height: 0
    })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning && dragStart) {
      const dx = e.clientX - dragStart.x
      const dy = e.clientY - dragStart.y
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }))
      setDragStart({ x: e.clientX, y: e.clientY })
      return
    }

    const coords = getCanvasCoords(e)
    if (!coords) return

    const { x, y } = coords

    if (drawing && currentFrame) {
      setCurrentFrame({
        ...currentFrame,
        width: x - currentFrame.x,
        height: y - currentFrame.y
      })
      return
    }

    if (dragging && dragStart && selectedFrameIndex !== null) {
      const dx = x - dragStart.x
      const dy = y - dragStart.y
      setFrames(frames.map((f, i) => 
        i === selectedFrameIndex
          ? { ...f, x: f.x + dx, y: f.y + dy }
          : f
      ))
      setDragStart({ x, y })
      return
    }

    if (resizing && dragStart && selectedFrameIndex !== null) {
      const dx = x - dragStart.x
      const dy = y - dragStart.y
      
      setFrames(frames.map((f, i) => {
        if (i !== selectedFrameIndex) return f
        
        let newFrame = { ...f }
        switch (resizing) {
          case 'tl':
            newFrame.x += dx
            newFrame.y += dy
            newFrame.width -= dx
            newFrame.height -= dy
            break
          case 'tr':
            newFrame.y += dy
            newFrame.width += dx
            newFrame.height -= dy
            break
          case 'bl':
            newFrame.x += dx
            newFrame.width -= dx
            newFrame.height += dy
            break
          case 'br':
            newFrame.width += dx
            newFrame.height += dy
            break
        }
        return newFrame
      }))
      setDragStart({ x, y })
    }
  }

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false)
      setDragStart(null)
      return
    }

    if (drawing && currentFrame && Math.abs(currentFrame.width) > 5 && Math.abs(currentFrame.height) > 5) {
      const normalized = {
        page: currentFrame.page,
        x: Math.round(currentFrame.width < 0 ? currentFrame.x + currentFrame.width : currentFrame.x),
        y: Math.round(currentFrame.height < 0 ? currentFrame.y + currentFrame.height : currentFrame.y),
        width: Math.round(Math.abs(currentFrame.width)),
        height: Math.round(Math.abs(currentFrame.height))
      }
      const newFrames = [...frames, normalized]
      setFrames(newFrames)
      setSelectedFrameIndex(newFrames.length - 1)
    }
    
    setDrawing(false)
    setDragging(false)
    setResizing(null)
    setCurrentFrame(null)
    setDragStart(null)
  }

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
        await cropResponse.text()
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
              onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
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
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ 
                cursor: isPanning ? 'grabbing' : spacePressed ? 'grab' : drawing ? 'crosshair' : dragging ? 'move' : resizing ? 'nwse-resize' : 'default',
                maxWidth: '100%',
                maxHeight: 'calc(90vh - 200px)',
                display: 'block',
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                transition: isPanning ? 'none' : 'transform 0.1s ease-out'
              }}
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

