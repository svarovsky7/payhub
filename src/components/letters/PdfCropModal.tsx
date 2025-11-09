import { Modal, Button, Space, message, Card, Typography } from 'antd'
import { useState, useRef, useEffect } from 'react'
import { ScissorOutlined, LeftOutlined, RightOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'
import { supabase } from '../../lib/supabase'
import { createAuditLogEntry } from '../../services/auditLogService'

const { Text } = Typography

interface PdfCropModalProps {
  visible: boolean
  onCancel: () => void
  onSuccess: (croppedPdfPath: string) => void
  attachmentUrl: string
  fileName: string
  letterId: number
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
  letterId
}: PdfCropModalProps) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [frames, setFrames] = useState<Frame[]>([])
  const [drawing, setDrawing] = useState(false)
  const [currentFrame, setCurrentFrame] = useState<Frame | null>(null)
  const [processing, setProcessing] = useState(false)
  const [pageImages, setPageImages] = useState<string[]>([])
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [draggedFrameIndex, setDraggedFrameIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (visible && attachmentUrl) {
      loadPdfPages()
    } else {
      setFrames([])
      setCurrentPage(1)
      setPageImages([])
    }
  }, [visible, attachmentUrl])

  useEffect(() => {
    if (pageImages.length > 0 && canvasRef.current) {
      drawCanvas()
    }
  }, [currentPage, frames, pageImages, selectedFrameIndex, currentFrame])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedFrameIndex !== null) {
        setFrames(frames.filter((_, i) => i !== selectedFrameIndex))
        setSelectedFrameIndex(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedFrameIndex, frames])

  const loadPdfPages = async () => {
    try {
      message.info('Загрузка страниц PDF...')
      
      // Загружаем PDF напрямую без signed URL
      const response = await fetch(attachmentUrl, { mode: 'cors' })
      if (!response.ok) {
        throw new Error(`Не удалось загрузить файл: ${response.status}`)
      }
      
      const blob = await response.blob()
      console.log('[PdfCropModal] Loaded blob:', { 
        size: blob.size, 
        type: blob.type,
        fileName 
      })
      
      // Создаем File объект с явным типом и оригинальным именем
      const pdfFile = new File([blob], fileName, { 
        type: 'application/pdf',
        lastModified: Date.now()
      })
      
      console.log('[PdfCropModal] Created file:', {
        name: pdfFile.name,
        size: pdfFile.size,
        type: pdfFile.type
      })
      
      const formData = new FormData()
      // Поле должно называться 'files' с несколькими файлами через append
      formData.append('files', pdfFile, fileName)
      formData.append('dpi', '200')
      formData.append('jpeg_quality', '85')
      formData.append('mode', 'color')

      console.log('[PdfCropModal] Sending request to API...')
      
      const convertResponse = await fetch('https://pdf.fvds.ru/convert', {
        method: 'POST',
        body: formData
      })

      if (!convertResponse.ok) {
        const errorText = await convertResponse.text()
        console.error('[PdfCropModal] API error:', { status: convertResponse.status, body: errorText })
        throw new Error(`Ошибка конвертации PDF: ${convertResponse.status}`)
      }
      
      console.log('[PdfCropModal] Conversion successful')

      const zipBlob = await convertResponse.blob()
      
      // Используем JSZip для извлечения изображений
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(zipBlob)
      
      const imageFiles: string[] = []
      const fileNames = Object.keys(zip.files).filter(name => 
        name.endsWith('.jpg') || name.endsWith('.jpeg')
      ).sort()

      for (const fileName of fileNames) {
        const file = zip.files[fileName]
        const blob = await file.async('blob')
        const url = URL.createObjectURL(blob)
        imageFiles.push(url)
      }

      setPageImages(imageFiles)
      setTotalPages(imageFiles.length)
      message.success(`Загружено ${imageFiles.length} страниц`)
    } catch (error) {
      console.error('[PdfCropModal] Load error:', error)
      message.error('Ошибка загрузки страниц PDF')
    }
  }

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas || pageImages.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      // Рисуем существующие рамки для текущей страницы (API uses 0-based page indexing)
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
        
        // Рисуем захваты для выбранной рамки
        if (isSelected) {
          const handleSize = 16
          ctx.fillStyle = '#52c41a'
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 2
          // Верхний левый
          ctx.fillRect(frame.x - handleSize / 2, frame.y - handleSize / 2, handleSize, handleSize)
          ctx.strokeRect(frame.x - handleSize / 2, frame.y - handleSize / 2, handleSize, handleSize)
          // Верхний правый
          ctx.fillRect(frame.x + frame.width - handleSize / 2, frame.y - handleSize / 2, handleSize, handleSize)
          ctx.strokeRect(frame.x + frame.width - handleSize / 2, frame.y - handleSize / 2, handleSize, handleSize)
          // Нижний левый
          ctx.fillRect(frame.x - handleSize / 2, frame.y + frame.height - handleSize / 2, handleSize, handleSize)
          ctx.strokeRect(frame.x - handleSize / 2, frame.y + frame.height - handleSize / 2, handleSize, handleSize)
          // Нижний правый
          ctx.fillRect(frame.x + frame.width - handleSize / 2, frame.y + frame.height - handleSize / 2, handleSize, handleSize)
          ctx.strokeRect(frame.x + frame.width - handleSize / 2, frame.y + frame.height - handleSize / 2, handleSize, handleSize)
        }
        
        // Рисуем номер блока
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

      // Рисуем текущую рисуемую рамку
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
    img.src = pageImages[currentPage - 1]
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
    const coords = getCanvasCoords(e)
    if (!coords) return

    const { x, y } = coords

    // Проверяем клик по существующим рамкам на текущей странице
    const pageFrames = frames
      .map((f, i) => ({ frame: f, index: i }))
      .filter(({ frame }) => frame.page === currentPage - 1)

    // Проверяем клик по захватам выбранной рамки
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

    // Проверяем клик внутри рамки для перемещения
    for (let i = pageFrames.length - 1; i >= 0; i--) {
      const { frame, index } = pageFrames[i]
      if (isPointInFrame(x, y, frame)) {
        setSelectedFrameIndex(index)
        setDragging(true)
        setDragStart({ x, y })
        return
      }
    }

    // Начинаем рисование новой рамки
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
    const coords = getCanvasCoords(e)
    if (!coords) return

    const { x, y } = coords

    // Рисование новой рамки
    if (drawing && currentFrame) {
      setCurrentFrame({
        ...currentFrame,
        width: x - currentFrame.x,
        height: y - currentFrame.y
      })
      return
    }

    // Перемещение рамки
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

    // Изменение размера рамки
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

  const moveFrameUp = (index: number) => {
    if (index === 0) return
    const newFrames = [...frames]
    ;[newFrames[index - 1], newFrames[index]] = [newFrames[index], newFrames[index - 1]]
    setFrames(newFrames)
    if (selectedFrameIndex === index) {
      setSelectedFrameIndex(index - 1)
    } else if (selectedFrameIndex === index - 1) {
      setSelectedFrameIndex(index)
    }
  }

  const moveFrameDown = (index: number) => {
    if (index === frames.length - 1) return
    const newFrames = [...frames]
    ;[newFrames[index], newFrames[index + 1]] = [newFrames[index + 1], newFrames[index]]
    setFrames(newFrames)
    if (selectedFrameIndex === index) {
      setSelectedFrameIndex(index + 1)
    } else if (selectedFrameIndex === index + 1) {
      setSelectedFrameIndex(index)
    }
  }

  const deleteFrame = (index: number) => {
    setFrames(frames.filter((_, i) => i !== index))
    if (selectedFrameIndex === index) {
      setSelectedFrameIndex(null)
    } else if (selectedFrameIndex !== null && selectedFrameIndex > index) {
      setSelectedFrameIndex(selectedFrameIndex - 1)
    }
  }

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedFrameIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', String(index))
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    
    if (draggedFrameIndex === null || draggedFrameIndex === dropIndex) {
      setDraggedFrameIndex(null)
      setDragOverIndex(null)
      return
    }

    const newFrames = [...frames]
    const [draggedFrame] = newFrames.splice(draggedFrameIndex, 1)
    newFrames.splice(dropIndex, 0, draggedFrame)
    
    setFrames(newFrames)
    
    // Обновляем selectedFrameIndex если нужно
    if (selectedFrameIndex === draggedFrameIndex) {
      setSelectedFrameIndex(dropIndex)
    } else if (selectedFrameIndex !== null) {
      if (draggedFrameIndex < selectedFrameIndex && dropIndex >= selectedFrameIndex) {
        setSelectedFrameIndex(selectedFrameIndex - 1)
      } else if (draggedFrameIndex > selectedFrameIndex && dropIndex <= selectedFrameIndex) {
        setSelectedFrameIndex(selectedFrameIndex + 1)
      }
    }
    
    setDraggedFrameIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedFrameIndex(null)
    setDragOverIndex(null)
  }

  const handleMouseUp = () => {
    if (drawing && currentFrame && Math.abs(currentFrame.width) > 5 && Math.abs(currentFrame.height) > 5) {
      // Нормализуем отрицательные размеры и округляем до целых
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
      message.info('Обрезка и сборка документа...')

      const response = await fetch(attachmentUrl, { mode: 'cors' })
      if (!response.ok) {
        throw new Error(`Не удалось загрузить файл: ${response.status}`)
      }
      
      const blob = await response.blob()
      console.log('[PdfCropModal] Crop - loaded blob:', { size: blob.size, framesCount: frames.length })
      
      const pdfFile = new File([blob], fileName, { 
        type: 'application/pdf',
        lastModified: Date.now()
      })

      const formData = new FormData()
      formData.append('file', pdfFile, fileName)
      formData.append('frames', JSON.stringify(frames))
      formData.append('dpi', '200')
      
      console.log('[PdfCropModal] Sending crop request with frames:', frames)

      const cropResponse = await fetch('https://pdf.fvds.ru/crop-to-pdf', {
        method: 'POST',
        body: formData
      })

      if (!cropResponse.ok) {
        const errorText = await cropResponse.text()
        console.error('[PdfCropModal] Crop API error:', { status: cropResponse.status, body: errorText })
        throw new Error(`Ошибка обрезки PDF: ${cropResponse.status}`)
      }
      
      console.log('[PdfCropModal] Crop successful')

      const croppedBlob = await cropResponse.blob()
      
      // Загружаем результат в storage
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Пользователь не авторизован')

      const baseName = fileName.replace(/\.[^/.]+$/, '')
      const storagePath = `letters/${letterId}/${Date.now()}_cropped.pdf`
      const file = new File([croppedBlob], `${baseName}_cropped.pdf`, { type: 'application/pdf' })

      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(storagePath, file)

      if (uploadError) throw uploadError

      // Создаем запись в БД
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

      // Привязываем к письму
      const { error: letterLinkError } = await supabase
        .from('letter_attachments')
        .insert({
          letter_id: letterId,
          attachment_id: newAttachment.id
        })

      if (letterLinkError) throw letterLinkError

      // Создаем запись в истории письма
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

      message.success('Документ обрезан и сохранен')
      onSuccess(storagePath)
    } catch (error: any) {
      console.error('[PdfCropModal] Crop error:', error)
      message.error(error.message || 'Ошибка обрезки документа')
    } finally {
      setProcessing(false)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1)
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
      <div ref={containerRef} style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Space>
            <Button
              icon={<LeftOutlined />}
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              Предыдущая
            </Button>
            <span>
              Страница {currentPage} из {totalPages}
            </span>
            <Button
              icon={<RightOutlined />}
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
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

          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: 4, 
            overflow: 'auto', 
            maxHeight: 'calc(90vh - 200px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#f5f5f5'
          }}>
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ 
                cursor: drawing ? 'crosshair' : dragging ? 'move' : resizing ? 'nwse-resize' : 'default',
                maxWidth: '100%',
                maxHeight: 'calc(90vh - 200px)',
                display: 'block'
              }}
            />
          </div>
        </div>

        <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Card 
            size="small" 
            title="Порядок блоков" 
            extra={<Text type="secondary">{frames.length} блоков</Text>}
          >
            <div style={{ maxHeight: 'calc(90vh - 200px)', overflowY: 'auto' }}>
              {frames.length === 0 ? (
                <Text type="secondary">Нарисуйте области на документе</Text>
              ) : (
                frames.map((frame, index) => (
                  <Card
                    key={index}
                    size="small"
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    style={{
                      marginBottom: 8,
                      cursor: draggedFrameIndex === index ? 'grabbing' : 'grab',
                      border: selectedFrameIndex === index ? '2px solid #52c41a' : 
                              dragOverIndex === index ? '2px dashed #1890ff' : 
                              '1px solid #d9d9d9',
                      background: selectedFrameIndex === index ? '#f6ffed' : 
                                  draggedFrameIndex === index ? '#fafafa' :
                                  dragOverIndex === index ? '#e6f7ff' :
                                  '#fff',
                      opacity: draggedFrameIndex === index ? 0.5 : 1,
                      transform: dragOverIndex === index ? 'scale(1.02)' : 'scale(1)',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => {
                      setSelectedFrameIndex(index)
                      setCurrentPage(frame.page + 1)
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <Text strong>Блок {index + 1}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Стр. {frame.page + 1} | {Math.round(frame.width)}×{Math.round(frame.height)}px
                        </Text>
                      </div>
                      <Space direction="vertical" size={0}>
                        <Button
                          type="text"
                          size="small"
                          icon={<ArrowUpOutlined />}
                          disabled={index === 0}
                          onClick={(e) => {
                            e.stopPropagation()
                            moveFrameUp(index)
                          }}
                        />
                        <Button
                          type="text"
                          size="small"
                          icon={<ArrowDownOutlined />}
                          disabled={index === frames.length - 1}
                          onClick={(e) => {
                            e.stopPropagation()
                            moveFrameDown(index)
                          }}
                        />
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteFrame(index)
                          }}
                        />
                      </Space>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </Modal>
  )
}

