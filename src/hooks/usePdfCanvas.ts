import { useState, useEffect, type RefObject } from 'react'

interface Frame {
  page: number
  x: number
  y: number
  width: number
  height: number
}

export const usePdfCanvas = (
  canvasRef: RefObject<HTMLCanvasElement>,
  pageImages: string[],
  currentPage: number
) => {
  const [frames, setFrames] = useState<Frame[]>([])
  const [drawing, setDrawing] = useState(false)
  const [currentFrame, setCurrentFrame] = useState<Frame | null>(null)
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [spacePressed, setSpacePressed] = useState(false)

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

  useEffect(() => {
    if (pageImages.length > 0 && canvasRef.current) {
      drawCanvas()
    }
  }, [currentPage, frames, pageImages, selectedFrameIndex, currentFrame])

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
        
        const newFrame = { ...f }
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

  return {
    frames,
    setFrames,
    drawing,
    selectedFrameIndex,
    setSelectedFrameIndex,
    dragging,
    resizing,
    scale,
    setScale,
    pan,
    setPan,
    isPanning,
    setIsPanning,
    spacePressed,
    setSpacePressed,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp
  }
}

