import { useState, useEffect } from 'react'
import { Button, Tabs, Form } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
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
import { EmployeeStats } from './employees/EmployeeStats'
import { EmployeesTable } from './employees/EmployeesTable'
import { EmployeeFormModal } from './employees/EmployeeFormModal'
import { DepartmentModal } from './employees/DepartmentModal'
import { PositionModal } from './employees/PositionModal'
import { DepartmentsTable } from './employees/DepartmentsTable'
import { PositionsTable } from './employees/PositionsTable'

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


  return (
    <div>
      <EmployeeStats
        employees={employees}
        departments={departments}
        positions={positions}
      />

      <Tabs
        defaultActiveKey="employees"
        items={[
          {
            key: 'employees',
            label: 'Сотрудники',
            children: (
              <>
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

                <EmployeesTable
                  employees={employees}
                  departments={departments}
                  positions={positions}
                  loading={loading}
                  onEdit={handleEditEmployee}
                  onDelete={handleDeleteEmployee}
                  onToggleStatus={handleToggleStatus}
                />
              </>
            ),
          },
          {
            key: 'departments',
            label: 'Отделы',
            children: (
              <>
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

                <DepartmentsTable
                  departments={departments}
                  employees={employees}
                  loading={loading}
                  onEdit={handleEditDepartment}
                  onDelete={handleDeleteDepartment}
                />
              </>
            ),
          },
          {
            key: 'positions',
            label: 'Должности',
            children: (
              <>
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

                <PositionsTable
                  positions={positions}
                  employees={employees}
                  loading={loading}
                  onEdit={handleEditPosition}
                  onDelete={handleDeletePosition}
                />
              </>
            ),
          },
        ]}
      />

      <EmployeeFormModal
        visible={employeeModalVisible}
        onCancel={() => {
          setEmployeeModalVisible(false)
          setEditingEmployee(null)
          employeeForm.resetFields()
        }}
        onSubmit={handleEmployeeSubmit}
        editingEmployee={editingEmployee}
        departments={departments}
        positions={positions}
        form={employeeForm}
      />

      <DepartmentModal
        visible={departmentModalVisible}
        onCancel={() => {
          setDepartmentModalVisible(false)
          setEditingDepartment(null)
          departmentForm.resetFields()
        }}
        onSubmit={handleDepartmentSubmit}
        editingDepartment={editingDepartment}
        form={departmentForm}
      />

      <PositionModal
        visible={positionModalVisible}
        onCancel={() => {
          setPositionModalVisible(false)
          setEditingPosition(null)
          positionForm.resetFields()
        }}
        onSubmit={handlePositionSubmit}
        editingPosition={editingPosition}
        form={positionForm}
      />
    </div>
  )
}