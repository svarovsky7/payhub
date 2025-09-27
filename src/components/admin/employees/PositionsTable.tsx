import React from 'react'
import { Table, Button, Space, Popconfirm } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Position, Employee } from '../../../services/employeeOperations'

interface PositionsTableProps {
  positions: Position[]
  employees: Employee[]
  loading: boolean
  onEdit: (position: Position) => void
  onDelete: (id: number) => void
}

export const PositionsTable: React.FC<PositionsTableProps> = ({
  positions,
  employees,
  loading,
  onEdit,
  onDelete
}) => {
  const columns: ColumnsType<Position> = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      render: (desc) => desc || '—',
    },
    {
      title: 'Сотрудников',
      key: 'employee_count',
      render: (_, record) =>
        employees.filter(e => e.position_id === record.id).length,
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
            size="small"
          />
          <Popconfirm
            title="Удалить должность?"
            description="Все сотрудники с этой должностью будут откреплены"
            onConfirm={() => onDelete(record.id)}
            okText="Удалить"
            cancelText="Отмена"
          >
            <Button
              icon={<DeleteOutlined />}
              danger
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={positions}
      rowKey="id"
      loading={loading}
      pagination={{
        defaultPageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `Всего: ${total}`,
      }}
    />
  )
}