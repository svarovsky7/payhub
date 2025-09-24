import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Popconfirm,
  Tag,
  Tabs,
  Card,
  Row,
  Col,
  Typography,
  message
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  TeamOutlined,
  IdcardOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  loadEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  toggleEmployeeStatus,
  loadDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  loadPositions,
  createPosition,
  updatePosition,
  deletePosition,
  type Employee,
  type Department,
  type Position
} from '../../services/employeeOperations'
import { useAuth } from '../../contexts/AuthContext'

const { Title } = Typography
const { TabPane } = Tabs

export const EmployeesTab = () => {
  const { user } = useAuth()

  // Employees state
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(false)

  // Modal states
  const [employeeModalVisible, setEmployeeModalVisible] = useState(false)
  const [departmentModalVisible, setDepartmentModalVisible] = useState(false)
  const [positionModalVisible, setPositionModalVisible] = useState(false)

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [editingPosition, setEditingPosition] = useState<Position | null>(null)

  // Forms
  const [employeeForm] = Form.useForm()
  const [departmentForm] = Form.useForm()
  const [positionForm] = Form.useForm()

  // Load data
  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [employeesData, departmentsData, positionsData] = await Promise.all([
        loadEmployees(),
        loadDepartments(),
        loadPositions()
      ])
      setEmployees(employeesData)
      setDepartments(departmentsData)
      setPositions(positionsData)
    } finally {
      setLoading(false)
    }
  }

  // Employee handlers
  const handleEmployeeSubmit = async (values: any) => {
    try {
      const employeeData = {
        ...values,
        is_active: values.is_active ?? true
      }

      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, employeeData)
      } else {
        await createEmployee(employeeData, user?.id || '')
      }

      await loadAllData()
      setEmployeeModalVisible(false)
      employeeForm.resetFields()
      setEditingEmployee(null)
    } catch (error) {
      console.error('Error saving employee:', error)
    }
  }

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee)
    employeeForm.setFieldsValue({
      ...employee
    })
    setEmployeeModalVisible(true)
  }

  const handleDeleteEmployee = async (id: number) => {
    try {
      await deleteEmployee(id)
      await loadAllData()
    } catch (error) {
      console.error('Error deleting employee:', error)
    }
  }

  const handleToggleStatus = async (id: number, is_active: boolean) => {
    try {
      await toggleEmployeeStatus(id, is_active)
      await loadAllData()
    } catch (error) {
      console.error('Error toggling employee status:', error)
    }
  }

  // Department handlers
  const handleDepartmentSubmit = async (values: any) => {
    try {
      if (editingDepartment) {
        await updateDepartment(editingDepartment.id, values.name, values.description)
      } else {
        await createDepartment(values.name, values.description)
      }

      await loadAllData()
      setDepartmentModalVisible(false)
      departmentForm.resetFields()
      setEditingDepartment(null)
    } catch (error) {
      console.error('Error saving department:', error)
    }
  }

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department)
    departmentForm.setFieldsValue(department)
    setDepartmentModalVisible(true)
  }

  const handleDeleteDepartment = async (id: number) => {
    try {
      await deleteDepartment(id)
      await loadAllData()
    } catch (error) {
      console.error('Error deleting department:', error)
    }
  }

  // Position handlers
  const handlePositionSubmit = async (values: any) => {
    try {
      if (editingPosition) {
        await updatePosition(editingPosition.id, values.name, values.description)
      } else {
        await createPosition(values.name, values.description)
      }

      await loadAllData()
      setPositionModalVisible(false)
      positionForm.resetFields()
      setEditingPosition(null)
    } catch (error) {
      console.error('Error saving position:', error)
    }
  }

  const handleEditPosition = (position: Position) => {
    setEditingPosition(position)
    positionForm.setFieldsValue(position)
    setPositionModalVisible(true)
  }

  const handleDeletePosition = async (id: number) => {
    try {
      await deletePosition(id)
      await loadAllData()
    } catch (error) {
      console.error('Error deleting position:', error)
    }
  }

  // Columns
  const employeeColumns: ColumnsType<Employee> = [
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
          onChange={(checked) => handleToggleStatus(record.id, checked)}
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
            onClick={() => handleEditEmployee(record)}
            size="small"
          />
          <Popconfirm
            title="Удалить сотрудника?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDeleteEmployee(record.id)}
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

  const departmentColumns: ColumnsType<Department> = [
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
            onClick={() => handleEditDepartment(record)}
            size="small"
          />
          <Popconfirm
            title="Удалить отдел?"
            description="Все сотрудники отдела будут откреплены"
            onConfirm={() => handleDeleteDepartment(record.id)}
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

  const positionColumns: ColumnsType<Position> = [
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
            onClick={() => handleEditPosition(record)}
            size="small"
          />
          <Popconfirm
            title="Удалить должность?"
            description="Все сотрудники с этой должностью будут откреплены"
            onConfirm={() => handleDeletePosition(record.id)}
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

  // Statistics
  const activeEmployees = employees.filter(e => e.is_active).length
  const totalDepartments = departments.length
  const totalPositions = positions.length

  return (
    <div>
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

      <Tabs defaultActiveKey="employees">
        <TabPane tab="Сотрудники" key="employees">
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingEmployee(null)
                employeeForm.resetFields()
                setEmployeeModalVisible(true)
              }}
            >
              Добавить сотрудника
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadAllData}
              style={{ marginLeft: 8 }}
            >
              Обновить
            </Button>
          </div>

          <Table
            columns={employeeColumns}
            dataSource={employees}
            rowKey="id"
            loading={loading}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Всего: ${total}`,
            }}
          />
        </TabPane>

        <TabPane tab="Отделы" key="departments">
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingDepartment(null)
                departmentForm.resetFields()
                setDepartmentModalVisible(true)
              }}
            >
              Добавить отдел
            </Button>
          </div>

          <Table
            columns={departmentColumns}
            dataSource={departments}
            rowKey="id"
            loading={loading}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Всего: ${total}`,
            }}
          />
        </TabPane>

        <TabPane tab="Должности" key="positions">
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingPosition(null)
                positionForm.resetFields()
                setPositionModalVisible(true)
              }}
            >
              Добавить должность
            </Button>
          </div>

          <Table
            columns={positionColumns}
            dataSource={positions}
            rowKey="id"
            loading={loading}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Всего: ${total}`,
            }}
          />
        </TabPane>
      </Tabs>

      {/* Employee Modal */}
      <Modal
        title={editingEmployee ? 'Редактировать сотрудника' : 'Добавить сотрудника'}
        open={employeeModalVisible}
        onCancel={() => {
          setEmployeeModalVisible(false)
          setEditingEmployee(null)
          employeeForm.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form
          form={employeeForm}
          layout="vertical"
          onFinish={handleEmployeeSubmit}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="last_name"
                label="Фамилия"
                rules={[{ required: true, message: 'Укажите фамилию' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="first_name"
                label="Имя"
                rules={[{ required: true, message: 'Укажите имя' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="middle_name"
                label="Отчество"
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="department_id"
                label="Отдел"
              >
                <Select
                  placeholder="Выберите отдел"
                  allowClear
                >
                  {departments.map(dept => (
                    <Select.Option key={dept.id} value={dept.id}>
                      {dept.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="position_id"
                label="Должность"
              >
                <Select
                  placeholder="Выберите должность"
                  allowClear
                >
                  {positions.map(pos => (
                    <Select.Option key={pos.id} value={pos.id}>
                      {pos.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[{ type: 'email', message: 'Некорректный email' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Телефон"
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="is_active"
            label="Статус"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch
              checkedChildren="Активен"
              unCheckedChildren="Уволен"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingEmployee ? 'Сохранить' : 'Добавить'}
              </Button>
              <Button
                onClick={() => {
                  setEmployeeModalVisible(false)
                  setEditingEmployee(null)
                  employeeForm.resetFields()
                }}
              >
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Department Modal */}
      <Modal
        title={editingDepartment ? 'Редактировать отдел' : 'Добавить отдел'}
        open={departmentModalVisible}
        onCancel={() => {
          setDepartmentModalVisible(false)
          setEditingDepartment(null)
          departmentForm.resetFields()
        }}
        footer={null}
      >
        <Form
          form={departmentForm}
          layout="vertical"
          onFinish={handleDepartmentSubmit}
        >
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Укажите название отдела' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingDepartment ? 'Сохранить' : 'Добавить'}
              </Button>
              <Button
                onClick={() => {
                  setDepartmentModalVisible(false)
                  setEditingDepartment(null)
                  departmentForm.resetFields()
                }}
              >
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Position Modal */}
      <Modal
        title={editingPosition ? 'Редактировать должность' : 'Добавить должность'}
        open={positionModalVisible}
        onCancel={() => {
          setPositionModalVisible(false)
          setEditingPosition(null)
          positionForm.resetFields()
        }}
        footer={null}
      >
        <Form
          form={positionForm}
          layout="vertical"
          onFinish={handlePositionSubmit}
        >
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Укажите название должности' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingPosition ? 'Сохранить' : 'Добавить'}
              </Button>
              <Button
                onClick={() => {
                  setPositionModalVisible(false)
                  setEditingPosition(null)
                  positionForm.resetFields()
                }}
              >
                Отмена
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}