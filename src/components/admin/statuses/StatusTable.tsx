import React from 'react'
import { Table, Button, Space, Tag } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

interface StatusTableProps {
  dataSource: any[]
  loading: boolean
  type: 'invoice' | 'payment' | 'contract'
  onEdit: (record: any) => void
  onDelete: (id: number) => void
}

const hexToTag: { [key: string]: string } = {
  '#d9d9d9': 'default',
  '#52c41a': 'success',
  '#1890ff': 'processing',
  '#faad14': 'warning',
  '#f5222d': 'error',
  '#13c2c2': 'cyan',
  '#722ed1': 'purple',
  '#eb2f96': 'magenta',
  '#a0d911': 'lime'
}

export const StatusTable: React.FC<StatusTableProps> = ({
  dataSource,
  loading,
  type,
  onEdit,
  onDelete
}) => {
  const getColumns = (): ColumnsType<any> => [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code'
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => {
        let tagColor = record.color || 'default'
        if (type === 'contract' && record.color && record.color.startsWith('#')) {
          tagColor = hexToTag[record.color.toLowerCase()] || 'default'
        }
        return <Tag color={tagColor}>{name}</Tag>
      }
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: 'Порядок',
      dataIndex: 'sort_order',
      key: 'sort_order',
      align: 'center',
      render: (sort_order) => sort_order || '-'
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => date ? new Date(date).toLocaleDateString('ru-RU') : '-'
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => onEdit(record)}
          />
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => onDelete(record.id)}
          />
        </Space>
      )
    }
  ]

  return (
    <Table
      columns={getColumns()}
      dataSource={dataSource}
      loading={loading}
      rowKey="id"
      pagination={{
        pageSize: 10,
        showTotal: (total) => `Всего: ${total} статусов`
      }}
    />
  )
}