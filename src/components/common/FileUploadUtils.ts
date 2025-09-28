import type { RcFile } from 'antd/es/upload'

export const getBase64 = (file: RcFile): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
  })

export const getFileType = (fileName: string): 'image' | 'pdf' | 'other' => {
  const ext = fileName.split('.').pop()?.toLowerCase()

  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext || '')) {
    return 'image'
  }

  if (ext === 'pdf') {
    return 'pdf'
  }

  return 'other'
}