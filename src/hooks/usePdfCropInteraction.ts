import { useState, type RefObject } from 'react'

interface Frame {
  page: number
  x: number
  y: number
  width: number
  height: number
}

export const usePdfCropInteraction = (
  canvasRef: RefObject<HTMLCanvasElement>,
  frames: Frame[],
  setFrames: (frames: Frame[]) => void,
  currentPage: number,
  selectedFrameIndex: number | null,
  setSelectedFrameIndex: (index: number | null) => void,
  spacePressed: boolean
) => {
  const [drawing, setDrawing] = useState(false)
  const [currentFrame, setCurrentFrame] = useState<Frame | null>(null)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState<'tl' | 'tr' | 'bl' | 'br' | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [isPanning, setIsPanning] = useState(false)

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

  const getCursor = () => {
    if (isPanning) return 'grabbing'
    if (spacePressed) return 'grab'
    if (drawing) return 'crosshair'
    if (dragging) return 'move'
    if (resizing) return 'nwse-resize'
    return 'default'
  }

  return {
    drawing,
    currentFrame,
    isPanning,
    dragging,
    resizing,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    getCursor
  }
}

