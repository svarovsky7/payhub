import React from 'react'
import { Space, Table, Typography, Tag, Progress } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons'
import type { ImportResult } from './importLogic'

const { Text, Title } = Typography

interface ImportResultStepProps {
  importResults: ImportResult[]
}

export const ImportResultStep: React.FC<ImportResultStepProps> = ({ importResults }) => {
  // Колонки для таблицы результатов
  const resultColumns = [
    {
      title: 'Строка',
      dataIndex: 'row',
      key: 'row',
      width: 70
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
      width: 200
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: 'success' | 'skip' | 'error') => {
        const config = {
          success: { color: 'success', icon: <CheckCircleOutlined />, text: 'Успех' },
          skip: { color: 'warning', icon: <WarningOutlined />, text: 'Пропущен' },
          error: { color: 'error', icon: <CloseCircleOutlined />, text: 'Ошибка' }
        }
        const cfg = config[status]
        return (
          <Tag color={cfg.color} icon={cfg.icon}>
            {cfg.text}
          </Tag>
        )
      }
    },
    {
      title: 'Сообщение',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true
    }
  ]

  // Статистика импорта
  const total = importResults.length
  const success = importResults.filter(r => r.status === 'success').length
  const skip = importResults.filter(r => r.status === 'skip').length
  const error = importResults.filter(r => r.status === 'error').length

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={5}>Результаты импорта</Title>
        <Space wrap>
          <Tag color="blue">Всего: {total}</Tag>
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Успешно: {success}
          </Tag>
          <Tag color="warning" icon={<WarningOutlined />}>
            Пропущено: {skip}
          </Tag>
          <Tag color="error" icon={<CloseCircleOutlined />}>
            Ошибки: {error}
          </Tag>
        </Space>
      </div>

      {total > 0 && (
        <Progress
          percent={Math.round((success / total) * 100)}
          status={error > 0 ? 'exception' : 'normal'}
          format={() => `${success} из ${total}`}
        />
      )}

      <Table
        columns={resultColumns}
        dataSource={importResults}
        size="small"
        pagination={{ pageSize: 10 }}
        scroll={{ y: 400 }}
        rowKey="row"
      />
    </Space>
  )
}
