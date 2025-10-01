import React from 'react'
import { Space, Alert, Table, Typography, Tag } from 'antd'
import { WarningOutlined } from '@ant-design/icons'
import type { ProjectData } from './excelParser'

const { Text } = Typography

interface ImportPreviewStepProps {
  parsedData: ProjectData[]
  duplicateCheck: { codes: string[], names: string[] }
}

export const ImportPreviewStep: React.FC<ImportPreviewStepProps> = ({
  parsedData,
  duplicateCheck
}) => {
  // Колонки для таблицы предпросмотра
  const previewColumns = [
    {
      title: '№',
      dataIndex: 'index',
      key: 'index',
      width: 50,
      render: (_text: unknown, _record: unknown, index: number) => index + 1
    },
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string) => code || <Text type="secondary">—</Text>
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string) => {
        const isDuplicate = duplicateCheck.names.includes(name)
        return isDuplicate ? (
          <Space>
            <WarningOutlined style={{ color: '#faad14' }} />
            <Text>{name}</Text>
          </Space>
        ) : name
      }
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (description: string) => description || <Text type="secondary">—</Text>
    },
    {
      title: 'Статус',
      key: 'status',
      width: 120,
      render: (_text: unknown, record: ProjectData) => {
        const isDuplicateCode = record.code && duplicateCheck.codes.includes(record.code)
        const isDuplicateName = duplicateCheck.names.includes(record.name)

        if (isDuplicateCode || isDuplicateName) {
          return <Tag color="warning">Дубликат</Tag>
        }
        return <Tag color="success">Новый</Tag>
      }
    }
  ]

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Alert
        message={`Найдено ${parsedData.length} проектов для импорта`}
        description={
          duplicateCheck.codes.length > 0 || duplicateCheck.names.length > 0
            ? `Обнаружены дубликаты: ${duplicateCheck.codes.length + duplicateCheck.names.length}. Они будут пропущены при импорте.`
            : 'Все проекты новые и будут импортированы.'
        }
        type={duplicateCheck.codes.length > 0 || duplicateCheck.names.length > 0 ? 'warning' : 'success'}
        showIcon
      />

      <Table
        columns={previewColumns}
        dataSource={parsedData}
        size="small"
        pagination={{ pageSize: 10 }}
        scroll={{ y: 400 }}
        rowKey={(_record, index) => index?.toString() || '0'}
      />
    </Space>
  )
}
