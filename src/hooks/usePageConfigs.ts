import { useState, useCallback } from 'react'

export interface PageConfig {
  pageNumber: number
  description: string
  isContinuation: boolean
}

export const usePageConfigs = () => {
  const [pageConfigs, setPageConfigs] = useState<PageConfig[]>([])
  const [selectedPageRow, setSelectedPageRow] = useState<number | null>(null)

  const extractPageConfigsFromMarkdown = useCallback((markdown: string): PageConfig[] => {
    const configs: PageConfig[] = []
    const regex = /\{(\d+)\}(-+)(?:\{([^}]+)\})?(-+)?/g
    let match
    
    while ((match = regex.exec(markdown)) !== null) {
      const markerNum = parseInt(match[1])
      const pageNumber = markerNum + 1
      const description = match[3] || ''
      const isContinuation = description.includes('ПРОДОЛЖЕНИЕ')
      const cleanDescription = isContinuation ? description.replace(' ПРОДОЛЖЕНИЕ', '').trim() : description.trim()
      
      configs.push({
        pageNumber,
        description: cleanDescription,
        isContinuation
      })
    }
    
    return configs
  }, [])

  const updateMarkdownWithPageConfigs = useCallback((markdown: string, configs: PageConfig[]): string => {
    const pageMarkers = Array.from(markdown.matchAll(/\{(\d+)\}(?:-+)?(?:\{[^}]*\})?(?:-+)?/g))
    if (pageMarkers.length === 0) return markdown

    let result = markdown
    const pageMap = new Map(configs.map(p => [p.pageNumber, p]))

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
            separator = `{${markerNum}}------------------------------------------------{${prevPageConfig.description} ПРОДОЛЖЕНИЕ}------------------------------------------------`
          } else {
            separator = `{${markerNum}}------------------------------------------------`
          }
        } else if (pageConfig.description) {
          separator = `{${markerNum}}------------------------------------------------{${pageConfig.description}}------------------------------------------------`
        } else {
          separator = `{${markerNum}}------------------------------------------------`
        }

        result = result.slice(0, match.index!) + separator + result.slice(match.index! + match[0].length)
      }
    }

    return result
  }, [])

  const handlePageDescriptionChange = useCallback((pageNumber: number, description: string) => {
    const updatedConfigs = pageConfigs.map(p => 
      p.pageNumber === pageNumber ? { ...p, description } : p
    )
    setPageConfigs(updatedConfigs)
    return updatedConfigs
  }, [pageConfigs])

  const handleContinuationChange = useCallback((pageNumber: number, checked: boolean) => {
    const updatedConfigs = pageConfigs.map(p => 
      p.pageNumber === pageNumber ? { ...p, isContinuation: checked, description: checked ? '' : p.description } : p
    )
    setPageConfigs(updatedConfigs)
    return updatedConfigs
  }, [pageConfigs])

  const handleQuickFillTag = useCallback((tag: string, onWarning: (msg: string) => void) => {
    if (selectedPageRow === null) {
      onWarning('Выберите страницу в таблице')
      return null
    }
    return handlePageDescriptionChange(selectedPageRow, tag)
  }, [selectedPageRow, handlePageDescriptionChange])

  return {
    pageConfigs,
    setPageConfigs,
    selectedPageRow,
    setSelectedPageRow,
    extractPageConfigsFromMarkdown,
    updateMarkdownWithPageConfigs,
    handlePageDescriptionChange,
    handleContinuationChange,
    handleQuickFillTag
  }
}

