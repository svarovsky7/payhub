import { useState } from 'react'
import { message } from 'antd'

export const usePdfLoader = () => {
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [pageImages, setPageImages] = useState<string[]>([])
  const [pageBlobs, setPageBlobs] = useState<Blob[]>([])
  const [totalPages, setTotalPages] = useState(1)

  const loadPdfPages = async (attachmentUrl: string, fileName: string) => {
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
        
        const img = new Image()
        await new Promise((resolve) => {
          img.onload = resolve
          img.src = url
        })
        imageDimensions.push({ width: img.width, height: img.height })
      }

      setPageImages(imageFiles)
      setTotalPages(imageFiles.length)
      setPageBlobs(imageBlobs)
      
      const maxWidth = Math.max(...imageDimensions.map(d => d.width))
      const maxHeight = Math.max(...imageDimensions.map(d => d.height))
      
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

  return {
    loading,
    loadingText,
    pageImages,
    pageBlobs,
    totalPages,
    loadPdfPages
  }
}

