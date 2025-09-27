import React from 'react'
import { Table, Button, Space, Popconfirm } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Department, Employee } from '../../../services/employeeOperations'

interface DepartmentsTableProps {
  departments: Department[]
  employees: Employee[]
  loading: boolean
  onEdit: (department: Department) => void
  onDelete: (id: number) => void
}

export const DepartmentsTable: React.FC<DepartmentsTableProps> = ({
  departments,
  employees,
  loading,
  onEdit,
  onDelete
}) => {
  const columns: ColumnsType<Department> = [
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
        employees.filter(e => e.department_id === record.id).length,
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
            title="Удалить отдел?"
            description="Все сотрудники отдела будут откреплены"
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
      dataSource={departments}
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