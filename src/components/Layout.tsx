import { Layout, Menu, Button, Avatar, Dropdown } from 'antd'
import {
  FileTextOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ControlOutlined,
  AuditOutlined,
  FormOutlined,
  DollarOutlined,
  MailOutlined,
  BarChartOutlined,
  ScanOutlined,
} from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const { Header, Sider, Content } = Layout

interface MainLayoutProps {
  children: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [allowedPages, setAllowedPages] = useState<string[]>([])
  const navigate = useNavigate()
  const location = useLocation()
  const { user, userProfile, signOut, currentRoleId } = useAuth()

  const userDisplayName = userProfile?.full_name || user?.email || 'Пользователь'

  // Load roles and current role's allowed pages
  useEffect(() => {
    const loadRoles = async () => {
      if (!user?.id) return

      try {
        // Load all roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('roles')
          .select('*')
          .order('name')

        if (rolesError) throw rolesError

        // Load current user's role with allowed pages
        if (currentRoleId) {
          const role = rolesData?.find(r => r.id === currentRoleId)
          if (role) {
            // Parse allowed_pages from JSON string if needed
            const pages = role.allowed_pages
              ? (typeof role.allowed_pages === 'string'
                  ? JSON.parse(role.allowed_pages)
                  : role.allowed_pages)
              : []
            setAllowedPages(pages)
          }
        } else {
          // No role selected, allow all pages
          setAllowedPages(['/invoices', '/material-requests', '/contracts', '/letters', '/letter-stats', '/documents', '/approvals', '/project-budgets', '/admin'])
        }

      } catch (error) {
        console.error('[Layout] Error loading roles:', error)
      }
    }

    loadRoles()
  }, [currentRoleId])

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('[MainLayout.handleLogout] Logout error:', error)
    }
  }

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'profile') {
      navigate('/profile')
    } else if (key === 'logout') {
      handleLogout()
    }
  }

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Профиль',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выйти',
    },
  ]

  // Filter menu items based on allowed pages
  const allMenuItems = [
    {
      key: '/invoices',
      icon: <FileTextOutlined />,
      label: 'Счета',
    },
    {
      key: '/material-requests',
      icon: <FormOutlined />,
      label: 'Заявки на материалы',
    },
    {
      key: '/contracts',
      icon: <FileTextOutlined />,
      label: 'Договоры',
    },
    {
      key: '/letters',
      icon: <MailOutlined />,
      label: 'Письма',
    },
    {
      key: '/letter-stats',
      icon: <BarChartOutlined />,
      label: 'Статистика писем',
    },
    {
      key: '/documents',
      icon: <ScanOutlined />,
      label: 'Распознавание документов',
    },
    {
      key: '/approvals',
      icon: <AuditOutlined />,
      label: 'Согласования',
    },
    {
      key: '/project-budgets',
      icon: <DollarOutlined />,
      label: 'Бюджеты проектов',
    },
    {
      key: '/admin',
      icon: <ControlOutlined />,
      label: 'Администрирование',
    },
  ]

  // Filter menu items based on allowed pages
  const menuItems = currentRoleId && allowedPages.length > 0
    ? allMenuItems.filter(item => allowedPages.includes(item.key))
    : allMenuItems // Show all items if no role selected or no restrictions

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={250}
        collapsedWidth={80}
        style={{
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          overflow: 'auto',
          zIndex: 1000
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: collapsed ? '18px' : '24px',
            fontWeight: 'bold',
          }}
        >
          {collapsed ? 'PH' : 'PayHub'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => {
            if (key === 'logout') return
            navigate(key)
          }}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 250, transition: 'margin-left 0.2s' }}>
        <Header
          style={{
            padding: 0,
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingRight: 24,
            position: 'sticky',
            top: 0,
            zIndex: 999
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Dropdown menu={{ items: userMenuItems, onClick: handleMenuClick }} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar icon={<UserOutlined />} />
                <span>{userDisplayName}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 24px',
            padding: 24,
            minHeight: 280,
            background: '#fff',
            borderRadius: 8,
            overflowX: 'clip',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
