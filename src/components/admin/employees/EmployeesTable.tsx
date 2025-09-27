import React from 'react'
import { Table, Button, Space, Popconfirm, Switch } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { Employee, Department, Position } from '../../../services/employeeOperations'

interface EmployeesTableProps {
  employees: Employee[]
  departments: Department[]
  positions: Position[]
  loading: boolean
  onEdit: (employee: Employee) => void
  onDelete: (id: number) => void
  onToggleStatus: (id: number, isActive: boolean) => void
}

export const EmployeesTable: React.FC<EmployeesTableProps> = ({
  employees,
  departments,
  positions,
  loading,
  onEdit,
  onDelete,
  onToggleStatus
}) => {
  const columns: ColumnsType<Employee> = [
    {
      title: 'ФИО',
      dataIndex: 'full_name',
      key: 'full_name',
      sorter: (a, b) => (a.full_name || '').localeCompare(b.full_name || ''),
    },
    {
      title: 'Отдел',
      dataIndex: ['department', 'name'],
      key: 'department',
      render: (_, record) => record.department?.name || '—',
      filters: departments.map(d => ({ text: d.name, value: d.id })),
      onFilter: (value, record) => record.department_id === value,
    },
    {
      title: 'Должность',
      dataIndex: ['position', 'name'],
      key: 'position',
      render: (_, record) => record.position?.name || '—',
      filters: positions.map(p => ({ text: p.name, value: p.id })),
      onFilter: (value, record) => record.position_id === value,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => email || '—',
    },
    {
      title: 'Телефон',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => phone || '—',
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (is_active, record) => (
        <Switch
          checked={is_active}
          onChange={(checked) => onToggleStatus(record.id, checked)}
          checkedChildren="Активен"
          unCheckedChildren="Уволен"
        />
      ),
      filters: [
        { text: 'Активные', value: true },
        { text: 'Уволенные', value: false },
      ],
      onFilter: (value, record) => record.is_active === value,
      defaultFilteredValue: [true],
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
            title="Удалить сотрудника?"
            description="Это действие нельзя отменить"
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
      dataSource={employees}
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