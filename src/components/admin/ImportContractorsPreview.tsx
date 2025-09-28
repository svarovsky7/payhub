import React from 'react'
import { Table, Space, Tag, Typography } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import type { ParsedContractor } from './ImportContractorsUtils'

const { Text } = Typography

interface ImportContractorsPreviewProps {
  data: ParsedContractor[]
}

export const ImportContractorsPreview: React.FC<ImportContractorsPreviewProps> = ({ data }) => {
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
      width: 150,
      render: (text: string, record: ParsedContractor) => (
        <Space direction="vertical" size={0}>
          <Text>{text}</Text>
          {record.originalInn !== text && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Исходный: {record.originalInn}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: 'Статус',
      dataIndex: 'valid',
      key: 'valid',
      width: 120,
      render: (valid: boolean) => (
        valid ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Корректно
          </Tag>
        ) : (
          <Tag color="error" icon={<CloseCircleOutlined />}>
            Ошибка
          </Tag>
        )
      )
    },
    {
      title: 'Примечание',
      dataIndex: 'error',
      key: 'error',
      render: (error: string) => error && (
        <Text type="danger" style={{ fontSize: 12 }}>{error}</Text>
      )
    }
  ]

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <div>
        <Text>Всего записей: {data.length}</Text>
        <br />
        <Text type="success">Корректных: {data.filter(c => c.valid).length}</Text>
        <br />
        <Text type="danger">С ошибками: {data.filter(c => !c.valid).length}</Text>
      </div>

      <Table
        columns={columns}
        dataSource={data}
        size="small"
        scroll={{ y: 400 }}
        pagination={false}
      />
    </Space>
  )
}