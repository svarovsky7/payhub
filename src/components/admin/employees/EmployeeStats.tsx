import React from 'react'
import { Row, Col, Card, Space } from 'antd'
import { UserOutlined, TeamOutlined, IdcardOutlined } from '@ant-design/icons'
import type { Employee, Department, Position } from '../../../services/employeeOperations'

interface EmployeeStatsProps {
  employees: Employee[]
  departments: Department[]
  positions: Position[]
}

export const EmployeeStats: React.FC<EmployeeStatsProps> = ({
  employees,
  departments,
  positions
}) => {
  const activeEmployees = employees.filter(e => e.is_active).length
  const totalDepartments = departments.length
  const totalPositions = positions.length

  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col span={8}>
        <Card>
          <Space>
            <UserOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <div>
              <div style={{ color: '#999', fontSize: 12 }}>Всего сотрудников</div>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>{employees.length}</div>
              <div style={{ color: '#52c41a', fontSize: 12 }}>Активных: {activeEmployees}</div>
            </div>
          </Space>
        </Card>
      </Col>
      <Col span={8}>
        <Card>
          <Space>
            <TeamOutlined style={{ fontSize: 24, color: '#722ed1' }} />
            <div>
              <div style={{ color: '#999', fontSize: 12 }}>Отделов</div>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>{totalDepartments}</div>
            </div>
          </Space>
        </Card>
      </Col>
      <Col span={8}>
        <Card>
          <Space>
            <IdcardOutlined style={{ fontSize: 24, color: '#fa8c16' }} />
            <div>
              <div style={{ color: '#999', fontSize: 12 }}>Должностей</div>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>{totalPositions}</div>
            </div>
          </Space>
        </Card>
      </Col>
    </Row>
  )
}