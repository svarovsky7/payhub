import React from 'react'
import { Upload, Button, message } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import type { UploadFile, RcFile } from 'antd/es/upload'

interface ContractFileUploadProps {
  fileList: UploadFile[]
  onChange: (fileList: UploadFile[]) => void
}

export const ContractFileUpload: React.FC<ContractFileUploadProps> = ({
  fileList,
  onChange
}) => {
  const beforeUpload = (file: RcFile) => {
    const isLt10M = file.size / 1024 / 1024 < 10
    if (!isLt10M) {
      message.error('Файл должен быть меньше 10MB!')
      return false
    }
    return false // Prevent automatic upload
  }

  const handlePreview = async (file: UploadFile) => {
    if (!file.url && !file.preview) {
      if (file.originFileObj) {
        const preview = await getBase64(file.originFileObj as RcFile)
        window.open(preview, '_blank')
      }
    } else {
      window.open(file.url || file.preview, '_blank')
    }
  }

  const getBase64 = (file: RcFile): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })

  return (
    <Upload
      fileList={fileList}
      onPreview={handlePreview}
      onChange={({ fileList }) => onChange(fileList)}
      beforeUpload={beforeUpload}
      multiple
    >
      <Button icon={<UploadOutlined />}>
        Загрузить файлы
      </Button>
    </Upload>
  )
}