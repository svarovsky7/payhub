import { useEffect } from 'react'
import { Tabs } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  UserOutlined,
  ProjectOutlined,
  SafetyOutlined,
  TeamOutlined,
  SolutionOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  AuditOutlined
} from '@ant-design/icons'
import { UsersTab } from '../components/admin/UsersTab'
import { ProjectsTab } from '../components/admin/ProjectsTab'
import { RolesTab } from '../components/admin/RolesTab'
import { ContractorsTab } from '../components/admin/ContractorsTab'
import { ContractorTypesTab } from '../components/admin/ContractorTypesTab'
import { InvoiceTypesTab } from '../components/admin/InvoiceTypesTab'
import { StatusesTab } from '../components/admin/StatusesTab'
import { PaymentTypesTab } from '../components/admin/PaymentTypesTab'
import { ApprovalRoutesTab } from '../components/admin/ApprovalRoutesTab'

const tabMapping: { [key: string]: string } = {
  '/admin': 'users',
  '/admin/users': 'users',
  '/admin/projects': 'projects',
  '/admin/roles': 'roles',
  '/admin/contractors': 'contractors',
  '/admin/contractor-types': 'contractor-types',
  '/admin/invoice-types': 'invoice-types',
  '/admin/statuses': 'statuses',
  '/admin/payment-types': 'payment-types',
  '/admin/approval-routes': 'approval-routes'
}

const pathMapping: { [key: string]: string } = {
  'users': '/admin/users',
  'projects': '/admin/projects',
  'roles': '/admin/roles',
  'contractors': '/admin/contractors',
  'contractor-types': '/admin/contractor-types',
  'invoice-types': '/admin/invoice-types',
  'statuses': '/admin/statuses',
  'payment-types': '/admin/payment-types',
  'approval-routes': '/admin/approval-routes'
}

export const AdminPage = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Определяем активную вкладку по URL
  const activeTab = tabMapping[location.pathname] || 'users'

  useEffect(() => {
    console.log('[AdminPage] Current path:', location.pathname, 'Active tab:', activeTab)
    // Если путь /admin без вкладки, перенаправляем на /admin/users
    if (location.pathname === '/admin') {
      navigate('/admin/users', { replace: true })
    }
  }, [location.pathname])

  const handleTabChange = (key: string) => {
    console.log('[AdminPage] Changing tab to:', key)
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
      key: 'contractor-types',
      label: 'Типы контрагентов',
      icon: <SolutionOutlined />,
      children: <ContractorTypesTab />
    },
    {
      key: 'invoice-types',
      label: 'Типы счетов',
      icon: <FileTextOutlined />,
      children: <InvoiceTypesTab />
    },
    {
      key: 'statuses',
      label: 'Статусы',
      icon: <CheckCircleOutlined />,
      children: <StatusesTab />
    },
    {
      key: 'payment-types',
      label: 'Типы платежей',
      icon: <DollarOutlined />,
      children: <PaymentTypesTab />
    },
    {
      key: 'approval-routes',
      label: 'Маршруты согласования',
      icon: <AuditOutlined />,
      children: <ApprovalRoutesTab />
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