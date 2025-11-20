import { useRef, useEffect } from 'react'

interface Frame {
  page: number
  x: number
  y: number
  width: number
  height: number
}

interface PdfCanvasProps {
  pageImages: string[]
  currentPage: number
  frames: Frame[]
  selectedFrameIndex: number | null
  currentFrame: Frame | null
  drawing: boolean
  scale: number
  pan: { x: number; y: number }
  isPanning: boolean
  spacePressed: boolean
  dragging: boolean
  resizing: 'tl' | 'tr' | 'bl' | 'br' | null
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void
  onMouseUp: () => void
}

export const PdfCanvas = ({
  pageImages,
  currentPage,
  frames,
  selectedFrameIndex,
  currentFrame,
  drawing,
  scale,
  pan,
  isPanning,
  spacePressed,
  dragging,
  resizing,
  onMouseDown,
  onMouseMove,
  onMouseUp
}: PdfCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
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
  }, [currentPage, frames, pageImages, selectedFrameIndex, currentFrame, drawing])

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
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
  )
}

