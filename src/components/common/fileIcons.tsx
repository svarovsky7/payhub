import { FileExcelOutlined, FileImageOutlined, FilePdfOutlined, FileTextOutlined, FileWordOutlined } from '@ant-design/icons'
import type { ReactElement } from 'react'

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'])
const WORD_EXTENSIONS = new Set(['doc', 'docx'])
const EXCEL_EXTENSIONS = new Set(['xls', 'xlsx'])

const getExtension = (fileName: string): string => fileName.split('.').pop()?.toLowerCase() ?? ''

export const getFileIcon = (fileName: string): ReactElement => {
  const ext = getExtension(fileName)

  if (IMAGE_EXTENSIONS.has(ext)) {
    return <FileImageOutlined />
  }

  if (ext === 'pdf') {
    return <FilePdfOutlined />
  }

  if (WORD_EXTENSIONS.has(ext)) {
    return <FileWordOutlined />
  }

  if (EXCEL_EXTENSIONS.has(ext)) {
    return <FileExcelOutlined />
  }

  return <FileTextOutlined />
}

