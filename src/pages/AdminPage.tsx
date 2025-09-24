import { useEffect } from 'react'
import { Tabs } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  UserOutlined,
  ProjectOutlined,
  SafetyOutlined,
  TeamOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  AuditOutlined,
  IdcardOutlined,
  BlockOutlined
} from '@ant-design/icons'
import { UsersTab } from '../components/admin/UsersTab'
import { ProjectsTab } from '../components/admin/ProjectsTab'
import { RolesTab } from '../components/admin/RolesTab'
import { ContractorsTab } from '../components/admin/ContractorsTab'
import { TypesTab } from '../components/admin/TypesTab'
import { StatusesTab } from '../components/admin/StatusesTab'
import { ApprovalRoutesTab } from '../components/admin/ApprovalRoutesTab'
import { EmployeesTab } from '../components/admin/EmployeesTab'
import { MaterialClassesTab } from '../components/admin/MaterialClassesTab'

const tabMapping: { [key: string]: string } = {
  '/admin': 'users',
  '/admin/users': 'users',
  '/admin/projects': 'projects',
  '/admin/roles': 'roles',
  '/admin/contractors': 'contractors',
  '/admin/employees': 'employees',
  '/admin/types': 'types',
  '/admin/statuses': 'statuses',
  '/admin/approval-routes': 'approval-routes',
  '/admin/material-classes': 'material-classes'
}

const pathMapping: { [key: string]: string } = {
  'users': '/admin/users',
  'projects': '/admin/projects',
  'roles': '/admin/roles',
  'contractors': '/admin/contractors',
  'employees': '/admin/employees',
  'types': '/admin/types',
  'statuses': '/admin/statuses',
  'approval-routes': '/admin/approval-routes',
  'material-classes': '/admin/material-classes'
}

export const AdminPage = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Определяем активную вкладку по URL
  const activeTab = tabMapping[location.pathname] || 'users'

  useEffect(() => {
    // Если путь /admin без вкладки, перенаправляем на /admin/users
    if (location.pathname === '/admin') {
      navigate('/admin/users', { replace: true })
    }
  }, [location.pathname])

  const handleTabChange = (key: string) => {
    const newPath = pathMapping[key]
    if (newPath) {
      navigate(newPath)
    }
  }

  const items = [
    {
      key: 'users',
      label: 'Пользователи',
      icon: <UserOutlined />,
      children: <UsersTab />
    },
    {
      key: 'projects',
      label: 'Проекты',
      icon: <ProjectOutlined />,
      children: <ProjectsTab />
    },
    {
      key: 'roles',
      label: 'Роли',
      icon: <SafetyOutlined />,
      children: <RolesTab />
    },
    {
      key: 'contractors',
      label: 'Контрагенты',
      icon: <TeamOutlined />,
      children: <ContractorsTab />
    },
    {
      key: 'employees',
      label: 'Сотрудники',
      icon: <IdcardOutlined />,
      children: <EmployeesTab />
    },
    {
      key: 'types',
      label: 'Типы',
      icon: <AppstoreOutlined />,
      children: <TypesTab />
    },
    {
      key: 'statuses',
      label: 'Статусы',
      icon: <CheckCircleOutlined />,
      children: <StatusesTab />
    },
    {
      key: 'approval-routes',
      label: 'Маршруты согласования',
      icon: <AuditOutlined />,
      children: <ApprovalRoutesTab />
    },
    {
      key: 'material-classes',
      label: 'Классификатор материалов',
      icon: <BlockOutlined />,
      children: <MaterialClassesTab />
    }
  ]

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Администрирование</h1>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={items}
        size="large"
      />
    </div>
  )
}