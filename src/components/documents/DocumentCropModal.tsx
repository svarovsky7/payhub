import { Modal, Button, Space, message, Card, Typography, Spin } from 'antd'
import { useState, useRef, useEffect } from 'react'
import { ScissorOutlined, LeftOutlined, RightOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons'

const { Text } = Typography

interface DocumentCropModalProps {
  visible: boolean
  onCancel: () => void
  onSuccess: (croppedBlob: Blob) => void
  attachmentUrl: string
  fileName: string
}

interface Frame {
  page: number
  x: number
  y: number
  width: number
  height: number
}

export const DocumentCropModal = ({
  visible,
  onCancel,
  onSuccess,
  attachmentUrl,
  fileName
}: DocumentCropModalProps) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [frames, setFrames] = useState<Frame[]>([])
  const [drawing, setDrawing] = useState(false)
  const [currentFrame, setCurrentFrame] = useState<Frame | null>(null)
  const [processing, setProcessing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [pageImages, setPageImages] = useState<string[]>([])
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [draggedFrameIndex, setDraggedFrameIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [pageDimensions, setPageDimensions] = useState<Array<{width: number, height: number}>>([])
  const [pageBlobs, setPageBlobs] = useState<Blob[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
    setLoading(true)
    try {
      setLoadingText('Загрузка PDF файла...')
      
      const response = await fetch(attachmentUrl, { mode: 'cors' })
      if (!response.ok) throw new Error(`Не удалось загрузить файл: ${response.status}`)
      
      const blob = await response.blob()
      const pdfFile = new File([blob], fileName, { 
        type: 'application/pdf',
        lastModified: Date.now()
      })
      
      setLoadingText('Конвертация страниц в изображения...')
      
      const formData = new FormData()
      formData.append('files', pdfFile, fileName)
      formData.append('dpi', '200')
      formData.append('jpeg_quality', '95')
      formData.append('mode', 'color')

      const convertResponse = await fetch('https://pdf.fvds.ru/convert', {
        method: 'POST',
        body: formData
      })

      if (!convertResponse.ok) {
        const errorText = await convertResponse.text()
        console.error('API error:', { status: convertResponse.status, body: errorText })
        throw new Error(`Ошибка конвертации PDF: ${convertResponse.status}`)
      }

      setLoadingText('Распаковка изображений...')
      const zipBlob = await convertResponse.blob()
      
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(zipBlob)
      
      setLoadingText('Подготовка страниц к отображению...')
      const imageFiles: string[] = []
      const fileNames = Object.keys(zip.files).filter(name => 
        name.endsWith('.jpg') || name.endsWith('.jpeg')
      ).sort()

            const imageDimensions: Array<{width: number, height: number}> = []
            const imageBlobs: Blob[] = []
            for (const fileName of fileNames) {
              const file = zip.files[fileName]
              const blob = await file.async('blob')
              const url = URL.createObjectURL(blob)
              imageFiles.push(url)
              imageBlobs.push(blob)
              
              // Определяем размеры изображения
              const img = new Image()
              await new Promise((resolve) => {
                img.onload = resolve
                img.src = url
              })
              imageDimensions.push({ width: img.width, height: img.height })
            }

            setPageImages(imageFiles)
            setTotalPages(imageFiles.length)
            setPageDimensions(imageDimensions)
            setPageBlobs(imageBlobs)
            
            const maxWidth = Math.max(...imageDimensions.map(d => d.width))
            const maxHeight = Math.max(...imageDimensions.map(d => d.height))
            console.log('[DocumentCropModal] Размеры страниц (DPI=200):', imageDimensions)
            console.log('[DocumentCropModal] Макс. размеры:', { maxWidth, maxHeight })
            
            if (maxWidth > 5000 || maxHeight > 5000) {
              message.warning({
                content: `PDF содержит большие страницы (макс: ${maxWidth}×${maxHeight}px при DPI=200). Используйте небольшие области!`,
                duration: 8
              })
            }
            message.success(`Загружено ${imageFiles.length} страниц`)
    } catch (error) {
      console.error('Load error:', error)
      message.error('Ошибка загрузки страниц PDF')
    } finally {
      setLoading(false)
      setLoadingText('')
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

    // Группируем блоки по страницам для информации
    const pageGroups = frames.reduce((acc, frame) => {
      const pageNum = frame.page + 1
      acc[pageNum] = (acc[pageNum] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    const pagesInfo = Object.entries(pageGroups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([page, count]) => `стр.${page}: ${count} обл.`)
      .join(', ')

    const uniquePages = Object.keys(pageGroups).length
    const hasMultipleRegionsPerPage = Object.values(pageGroups).some(count => count > 1)

          console.log('[DocumentCropModal] ===== ОБРЕЗКА ДОКУМЕНТА =====')
          console.log('[DocumentCropModal] Всего областей:', frames.length)
          console.log('[DocumentCropModal] Уникальных страниц:', uniquePages)
          console.log('[DocumentCropModal] Распределение по страницам:', pageGroups)
          console.log('[DocumentCropModal] Детали всех областей:')
          
          const largeCoords = frames.filter(f => f.x > 3000 || f.y > 3000 || f.width > 2000 || f.height > 2000)
          frames.forEach((f, i) => {
            const warning = (f.x > 3000 || f.y > 3000 || f.width > 2000 || f.height > 2000) ? ' ⚠️ БОЛЬШИЕ КООРДИНАТЫ!' : ''
            console.log(`  Блок ${i + 1}: страница ${f.page + 1}, координаты (${f.x}, ${f.y}), размер ${f.width}×${f.height}${warning}`)
          })
          
          if (largeCoords.length > 0) {
            console.error('[DocumentCropModal] ⚠️ КРИТИЧНО! Найдено', largeCoords.length, 'областей с очень большими координатами!')
            console.error('  API crop-to-pdf может не обработать такие координаты')
            console.error('  Рекомендация: используйте меньшие области или уменьшите масштаб PDF')
          }
    if (hasMultipleRegionsPerPage) {
      console.warn('[DocumentCropModal] ⚠️ ВНИМАНИЕ: На некоторых страницах несколько областей!')
      console.warn('  API crop-to-pdf объединит области с одной страницы в одну страницу результата')
      console.warn('  Ожидаемый результат:', uniquePages, 'страниц, а не', frames.length)
    }
    console.log('[DocumentCropModal] ===============================')

    Modal.confirm({
      title: 'Подтвердите обрезку',
      content: (
        <div>
          <p>Будет создан PDF из {frames.length} выделенных областей:</p>
          <p style={{ color: '#666', fontSize: 12 }}>{pagesInfo}</p>
          {hasMultipleRegionsPerPage && (
            <div style={{ 
              marginTop: 12, 
              padding: 8, 
              background: '#fff7e6', 
              border: '1px solid #ffd591',
              borderRadius: 4 
            }}>
              <p style={{ margin: 0, fontSize: 13, color: '#d46b08' }}>
                <strong>⚠️ Важно:</strong> API объединяет области с одной страницы.
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#ad6800' }}>
                Результат: ~{uniquePages} {uniquePages === 1 ? 'страница' : uniquePages < 5 ? 'страницы' : 'страниц'} вместо {frames.length}
              </p>
            </div>
          )}
          <p style={{ marginTop: 12, fontSize: 12 }}>
            Области будут объединены в порядке из списка справа.
          </p>
        </div>
      ),
      okText: 'Обрезать',
      cancelText: 'Отмена',
      width: 480,
      onOk: async () => {
        setProcessing(true)
        try {
          message.info(`Обрезка ${frames.length} областей...`)

                // Отправляем сами JPG изображения, чтобы сервер обрезал их, а не рендерил PDF заново
                const formData = new FormData()
                
                // Добавляем все изображения страниц
                pageBlobs.forEach((blob, index) => {
                  formData.append('page_images', blob, `page_${index}.jpg`)
                })
                
                formData.append('frames', JSON.stringify(frames))

                console.log('[DocumentCropModal] Отправка на crop-to-pdf API:')
                console.log('  Отправляем', pageBlobs.length, 'JPG изображений страниц')
                console.log('  Количество областей для обрезки:', frames.length)
                console.log('  JSON frames:', JSON.stringify(frames, null, 2))

          const cropResponse = await fetch('https://pdf.fvds.ru/crop-to-pdf', {
            method: 'POST',
            body: formData
          })

          if (!cropResponse.ok) {
            const errorText = await cropResponse.text()
            console.error('[DocumentCropModal] ❌ API вернул ошибку:', { 
              status: cropResponse.status, 
              body: errorText 
            })
            
            // Пытаемся распарсить детали ошибки
            let errorMessage = `Ошибка ${cropResponse.status}`
            try {
              const errorJson = JSON.parse(errorText)
              if (errorJson.detail) {
                errorMessage = errorJson.detail
                console.error('[DocumentCropModal] Детали ошибки:', errorJson.detail)
              }
            } catch (e) {
              errorMessage = errorText || errorMessage
            }
            
            throw new Error(errorMessage)
          }

          const croppedBlob = await cropResponse.blob()
          
          console.log('[DocumentCropModal] ✓ Обрезка завершена успешно!')
          console.log('  Размер результата:', (croppedBlob.size / 1024).toFixed(2), 'КБ')
          console.log('  Тип:', croppedBlob.type)
          console.log('  Исходных областей было:', frames.length)
          
          // Пытаемся определить количество страниц в результате
          try {
            const pdfText = await croppedBlob.text()
            const pageCountMatch = pdfText.match(/\/Count\s+(\d+)/)
            const detectedPages = pageCountMatch ? parseInt(pageCountMatch[1]) : null
            
            if (detectedPages) {
              console.log('  📄 Страниц в результате:', detectedPages)
              if (detectedPages !== frames.length) {
                console.warn('  ⚠️ ВНИМАНИЕ! Количество страниц не совпадает с количеством областей!')
                console.warn('    Ожидалось:', frames.length, 'страниц')
                console.warn('    Получено:', detectedPages, 'страниц')
                message.warning({
                  content: `Обрезано ${frames.length} областей, но PDF содержит ${detectedPages} страниц. Проверьте результат!`,
                  duration: 10
                })
              } else {
                console.log('  ✓ Количество страниц совпадает с количеством областей')
              }
            }
          } catch (e) {
            console.log('  ℹ️ Не удалось определить количество страниц автоматически')
          }
          
          console.log('  ВАЖНО: Откройте PDF и проверьте - содержит ли он все', frames.length, 'областей')
          
          message.success(`Документ обрезан: ${frames.length} областей → ${(croppedBlob.size / 1024).toFixed(0)} КБ`)
          onSuccess(croppedBlob)
        } catch (error: any) {
          console.error('[DocumentCropModal] Crop error:', error)
          message.error(error.message || 'Ошибка обрезки документа')
        } finally {
          setProcessing(false)
        }
      }
    })
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
      {loading ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px',
          gap: 16
        }}>
          <Spin size="large" />
          <Text type="secondary">{loadingText}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Это может занять некоторое время для больших файлов
          </Text>
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
            <span>Страница {currentPage} из {totalPages}</span>
            <Button
              icon={<RightOutlined />}
              onClick={() => currentPage < totalPages && setCurrentPage(currentPage + 1)}
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
            extra={
              <Space size={4}>
                <Text type="secondary">{frames.length} блоков</Text>
                {frames.length > 0 && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    ({new Set(frames.map(f => f.page)).size} стр.)
                  </Text>
                )}
              </Space>
            }
          >
            <div style={{ maxHeight: 'calc(90vh - 200px)', overflowY: 'auto' }}>
              {frames.length === 0 ? (
                <div>
                  <Text type="secondary">Нарисуйте области на документе</Text>
                  <div style={{ marginTop: 8, fontSize: 11, color: '#999' }}>
                    ▪ Зажмите и тяните для создания области<br/>
                    ▪ Перетащите для изменения положения<br/>
                    ▪ Тяните за углы для изменения размера<br/>
                    ▪ Delete для удаления выбранной области
                  </div>
                </div>
              ) : (
                frames.map((frame, index) => (
                  <Card
                    key={index}
                    size="small"
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={() => setDragOverIndex(null)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={() => {
                      setDraggedFrameIndex(null)
                      setDragOverIndex(null)
                    }}
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
      )}
    </Modal>
  )
}

