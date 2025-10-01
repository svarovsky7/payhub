import React from 'react'
import { Space, Alert, Upload, Button, Typography } from 'antd'
import { UploadOutlined } from '@ant-design/icons'

const { Text } = Typography

interface ImportUploadStepProps {
  onFileUpload: (file: File | { originFileObj?: File; name?: string }) => Promise<boolean>
}

export const ImportUploadStep: React.FC<ImportUploadStepProps> = ({ onFileUpload }) => {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Alert
        message="Формат файла"
        description={
          <div>
            <p>Excel файл должен содержать колонки:</p>
            <ul style={{ marginBottom: 8 }}>
              <li><strong>Код</strong> - уникальный код проекта (необязательно)</li>
              <li><strong>Название</strong> - название проекта (обязательно)</li>
              <li><strong>Описание</strong> - описание проекта (необязательно)</li>
            </ul>
            <p style={{ marginBottom: 0 }}>
              Первая строка должна содержать заголовки колонок.
            </p>
          </div>
        }
        type="info"
        showIcon
      />

      <Upload
        accept=".xlsx,.xls"
        beforeUpload={onFileUpload}
        showUploadList={false}
      >
        <Button icon={<UploadOutlined />} size="large" type="primary">
          Выбрать Excel файл
        </Button>
      </Upload>

      <Text type="secondary">
        Поддерживаются форматы: .xlsx, .xls
      </Text>
    </Space>
  )
}
