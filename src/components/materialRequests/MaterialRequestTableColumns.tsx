import { Button, Space, Tag, Tooltip } from 'antd'
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  DownOutlined,
  UpOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { MaterialRequest } from '../../services/materialRequestOperations'
import type { Project } from '../../lib/supabase'
import type { Employee } from '../../services/employeeOperations'

interface GetColumnsParams {
  projects: Project[]
  employees: Employee[]
  handleViewRequest: (request: MaterialRequest) => void
  handleEditRequest: (request: MaterialRequest) => void
  handleDeleteRequest: (requestId: string) => void
  handleExpandRow: (requestId: string) => void
  expandedRows: Set<string>
}

export const getMaterialRequestTableColumns = ({
  projects,
  employees,
  handleViewRequest,
  handleEditRequest,
  handleDeleteRequest,
  handleExpandRow,
  expandedRows
}: GetColumnsParams) => {
  return [
    {
      title: '',
      key: 'expand',
      width: 50,
      render: (_: any, record: MaterialRequest) => (
        <Button
          type="text"
          size="small"
          icon={expandedRows.has(record.id) ? <UpOutlined /> : <DownOutlined />}
          onClick={(e) => {
            e.stopPropagation()
            handleExpandRow(record.id)
          }}
        />
      )
    },
    {
      title: 'Номер',
      dataIndex: 'request_number',
      key: 'request_number',
      width: 150,
      sorter: (a: MaterialRequest, b: MaterialRequest) =>
        a.request_number.localeCompare(b.request_number),
      render: (number: string) => (
        <span style={{ fontWeight: 500 }}>{number}</span>
      )
    },
    {
      title: 'Дата',
      dataIndex: 'request_date',
      key: 'request_date',
      width: 120,
      sorter: (a: MaterialRequest, b: MaterialRequest) =>
        dayjs(a.request_date).unix() - dayjs(b.request_date).unix(),
      render: (date: string) => dayjs(date).format('DD.MM.YYYY')
    },
    {
      title: 'Проект',
      dataIndex: 'project_id',
      key: 'project_id',
      ellipsis: true,
      render: (projectId: number | null) => {
        if (!projectId) return '—'
        const project = projects.find(p => p.id === projectId)
        return project?.name || '—'
      }
    },
    {
      title: 'Ответственный',
      dataIndex: 'employee_id',
      key: 'employee_id',
      ellipsis: true,
      render: (employeeId: number | null) => {
        if (!employeeId) return '—'
        const employee = employees.find(e => e.id === employeeId)
        return employee?.full_name || '—'
      }
},
    {
      title: 'Позиций',
      dataIndex: 'total_items',
      key: 'total_items',
      width: 100,
      align: 'center' as const,
      render: (count: number) => (
        <Tag color="blue">{count || 0}</Tag>
      )
},
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: MaterialRequest) => (
        <Space>
          <Tooltip title="Просмотр">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                handleViewRequest(record)
              }}
            />
          </Tooltip>
          <Tooltip title="Редактировать">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                handleEditRequest(record)
              }}
            />
          </Tooltip>
          <Tooltip title="Удалить">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteRequest(record.id)
              }}
            />
          </Tooltip>
        </Space>
      )
    }
  ]
}