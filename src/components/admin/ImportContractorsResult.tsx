import React from 'react'
import { Table, Space, Tag, Typography } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

export interface ImportResult {
  line: number
  name: string
  inn: string
  status: 'success' | 'skip' | 'error'
  message?: string
}

interface ImportContractorsResultProps {
  results: ImportResult[]
}

export const ImportContractorsResult: React.FC<ImportContractorsResultProps> = ({ results }) => {
  const columns = [
    {
      title: '№',
      dataIndex: 'line',
      key: 'line',
      width: 60
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'ИНН',
      dataIndex: 'inn',
      key: 'inn',
      width: 150
    },
    {
      title: 'Результат',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        switch (status) {
          case 'success':
            return <Tag color="success" icon={<CheckCircleOutlined />}>Импортирован</Tag>
          case 'skip':
            return <Tag color="warning" icon={<WarningOutlined />}>Пропущен</Tag>
          case 'error':
            return <Tag color="error" icon={<CloseCircleOutlined />}>Ошибка</Tag>
          default:
            return null
        }
      }
    },
    {
      title: 'Сообщение',
      dataIndex: 'message',
      key: 'message',
      render: (message: string) => (
        <Text style={{ fontSize: 12 }}>{message}</Text>
      )
    }
  ]

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <div>
        <Title level={5}>Результаты импорта</Title>
        <Space>
          <Tag color="success">
            Импортировано: {results.filter(r => r.status === 'success').length}
          </Tag>
          <Tag color="warning">
            Пропущено: {results.filter(r => r.status === 'skip').length}
          </Tag>
          <Tag color="error">
            Ошибок: {results.filter(r => r.status === 'error').length}
          </Tag>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={results}
        size="small"
        scroll={{ y: 400 }}
        pagination={false}
      />
    </Space>
  )
}