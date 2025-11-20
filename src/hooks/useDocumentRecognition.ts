import { useState } from 'react'
import { message } from 'antd'
import { datalabService } from '../services/datalabService'
import { documentTaskService } from '../services/documentTaskService'
import type { PageConfig } from './usePageConfigs'

export const useDocumentRecognition = (taskId: string, onRefresh: () => void) => {
  const [recognizingFiles, setRecognizingFiles] = useState<Set<string>>(new Set())

  const processMarkdownWithPageConfig = (markdown: string, pages: PageConfig[]): string => {
    const pageMarkers = Array.from(markdown.matchAll(/\{(\d+)\}/g))
    if (pageMarkers.length === 0) return markdown

    let result = markdown
    const pageMap = new Map(pages.map(p => [p.pageNumber, p]))

    for (let i = pageMarkers.length - 1; i >= 0; i--) {
      const match = pageMarkers[i]
      const markerNum = parseInt(match[1])
      const pageNumber = markerNum + 1
      const pageConfig = pageMap.get(pageNumber)

      if (pageConfig) {
        let separator = ''

        if (pageConfig.isContinuation) {
          let prevPageConfig = null
          for (let prevPageNum = pageNumber - 1; prevPageNum >= 1; prevPageNum--) {
            const prev = pageMap.get(prevPageNum)
            if (prev && prev.description && !prev.isContinuation) {
              prevPageConfig = prev
              break
            }
          }

          if (prevPageConfig?.description) {
            separator = `{${markerNum}}------------------------------------------------{${prevPageConfig.description} ПРОДОЛЖЕНИЕ}`
          } else {
            separator = `{${markerNum}}------------------------------------------------`
          }
        } else if (pageConfig.description) {
          separator = `{${markerNum}}------------------------------------------------{${pageConfig.description}}`
        } else {
          separator = `{${markerNum}}------------------------------------------------`
        }

        result = result.slice(0, match.index!) + separator + result.slice(match.index! + match[0].length)
      }
    }

    return result
  }

  const pollRecognition = async (
    externalTaskId: string, 
    originalAttachmentId: string, 
    originalFileName: string, 
    pages?: PageConfig[]
  ) => {
    let attempts = 0
    const maxAttempts = 60

    const check = async (): Promise<boolean> => {
      attempts++
      try {
        const statusCheck = await datalabService.checkMarkerStatus(externalTaskId)
        
        if (statusCheck.isReady && statusCheck.markdown) {
          let finalMarkdown = statusCheck.markdown

          if (pages && pages.length > 0) {
            finalMarkdown = processMarkdownWithPageConfig(statusCheck.markdown, pages)
          }

          const markdownAttachmentId = await documentTaskService.createMarkdownAttachment(
            taskId,
            finalMarkdown,
            originalFileName
          )
          
          await documentTaskService.linkRecognizedFile(originalAttachmentId, markdownAttachmentId)
          message.success('Распознавание завершено')
          setRecognizingFiles(prev => {
            const next = new Set(prev)
            next.delete(originalAttachmentId)
            return next
          })
          onRefresh()
          return true
        }

        if (attempts >= maxAttempts) {
          throw new Error('Превышено время ожидания')
        }

        return false
      } catch {
        message.error('Ошибка распознавания')
        setRecognizingFiles(prev => {
          const next = new Set(prev)
          next.delete(originalAttachmentId)
          return next
        })
        onRefresh()
        return true
      }
    }

    const interval = setInterval(async () => {
      const done = await check()
      if (done) clearInterval(interval)
    }, 5000)
  }

  const startRecognition = async (
    fileUrl: string,
    fileId: string,
    fileName: string,
    pages?: PageConfig[]
  ) => {
    try {
      setRecognizingFiles(prev => new Set(prev).add(fileId))
      const externalTaskId = await datalabService.requestMarker(fileUrl)
      await pollRecognition(externalTaskId, fileId, fileName, pages)
    } catch (error: any) {
      console.error('Recognition error:', error)
      message.error('Ошибка распознавания')
      setRecognizingFiles(prev => {
        const next = new Set(prev)
        next.delete(fileId)
        return next
      })
    }
  }

  return {
    recognizingFiles,
    startRecognition
  }
}

