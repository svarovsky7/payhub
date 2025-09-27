import React from 'react'
import { Table, Button, Space } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

interface TypeRecord {
  id: number
  name: string
  code?: string
  is_active?: boolean
  created_at: string
  updated_at?: string
}

interface TypeTableProps {
  dataSource: TypeRecord[]
  loading: boolean
  typeCategory: 'invoice' | 'payment'
  onEdit: (record: TypeRecord) => void
  onDelete: (id: number) => void
}

export const TypeTable: React.FC<TypeTableProps> = ({
  dataSource,
  loading,
  typeCategory,
  onEdit,
  onDelete
}) => {
  const getColumns = (): ColumnsType<TypeRecord> => {
    const columns: ColumnsType<TypeRecord> = [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        sorter: (a, b) => a.id - b.id
      },
      {
        title: 'Название',
        dataIndex: 'name',
        key: 'name',
        sorter: (a, b) => a.name.localeCompare(b.name)
      },
      {
        title: 'Код',
        dataIndex: 'code',
        key: 'code',
        sorter: (a, b) => (a.code || '').localeCompare(b.code || ''),
        render: (code: string | undefined) => code || '-'
      }
    ]

    // Добавляем колонку is_active только для invoice_types
    if (typeCategory === 'invoice') {
      columns.push({
        title: 'Активен',
        dataIndex: 'is_active',
        key: 'is_active',
        sorter: (a, b) => {
          const aActive = a.is_active === undefined || a.is_active ? 1 : 0
          const bActive = b.is_active === undefined || b.is_active ? 1 : 0
          return aActive - bActive
        },
        render: (isActive: boolean | undefined) =>
          isActive === undefined || isActive ? 'Да' : 'Нет'
      })
    }

    columns.push({
      title: 'Создан',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (date: string) => date ? dayjs(date).format('DD.MM.YYYY HH:mm') : '-'
    })

    columns.push({
      title: 'Действия',
      key: 'actions',
      render: (_, record: TypeRecord) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          />
          <Button
            type="text"
            icon={<DeleteOutlined />}
            danger
            onClick={() => onDelete(record.id)}
          />
        </Space>
      )
    })

    return columns
  }

  const emptyText = typeCategory === 'invoice'
    ? 'Типы счетов не найдены'
    : 'Типы платежей не найдены'

  return (
    <Table
      columns={getColumns()}
      dataSource={dataSource}
      rowKey="id"
      loading={loading}
      pagination={{
        defaultPageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `Всего: ${total}`
      }}
      locale={{
        emptyText
      }}
    />
  )
}