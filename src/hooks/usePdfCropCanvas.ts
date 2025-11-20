import { useState, useEffect, type RefObject } from 'react'

interface Frame {
  page: number
  x: number
  y: number
  width: number
  height: number
}

export const usePdfCropCanvas = (
  canvasRef: RefObject<HTMLCanvasElement>,
  pageImages: string[],
  currentPage: number,
  frames: Frame[],
  selectedFrameIndex: number | null,
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

  return {
    drawing,
    setDrawing,
    currentFrame,
    setCurrentFrame,
    dragging,
    setDragging,
    resizing,
    setResizing,
    dragStart,
    setDragStart,
    isPanning,
    setIsPanning,
    getCanvasCoords,
    getResizeHandle,
    isPointInFrame
  }
}

