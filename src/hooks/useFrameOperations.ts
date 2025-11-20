import { useState } from 'react'

interface Frame {
  page: number
  x: number
  y: number
  width: number
  height: number
}

export const useFrameOperations = () => {
  const [draggedFrameIndex, setDraggedFrameIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const moveFrameUp = (frames: Frame[], index: number, selectedFrameIndex: number | null, setFrames: (frames: Frame[]) => void, setSelectedFrameIndex: (index: number | null) => void) => {
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

  const moveFrameDown = (frames: Frame[], index: number, selectedFrameIndex: number | null, setFrames: (frames: Frame[]) => void, setSelectedFrameIndex: (index: number | null) => void) => {
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

  const deleteFrame = (frames: Frame[], index: number, selectedFrameIndex: number | null, setFrames: (frames: Frame[]) => void, setSelectedFrameIndex: (index: number | null) => void) => {
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

  const handleDrop = (e: React.DragEvent, dropIndex: number, frames: Frame[], selectedFrameIndex: number | null, setFrames: (frames: Frame[]) => void, setSelectedFrameIndex: (index: number | null) => void) => {
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

  const handleDragEnd = () => {
    setDraggedFrameIndex(null)
    setDragOverIndex(null)
  }

  return {
    draggedFrameIndex,
    dragOverIndex,
    moveFrameUp,
    moveFrameDown,
    deleteFrame,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  }
}

