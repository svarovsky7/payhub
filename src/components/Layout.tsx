import { Layout, Menu, Button, Avatar, Dropdown, Select, message } from 'antd'
import {
  FileTextOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ControlOutlined,
  AuditOutlined,
  SafetyOutlined,
  FormOutlined,
} from '@ant-design/icons'
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const { Header, Sider, Content } = Layout

interface MainLayoutProps {
  children: React.ReactNode
}

interface Role {
  id: number
  code: string
  name: string
  allowed_pages?: any // JSON field for storing allowed pages array
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [changingRole, setChangingRole] = useState(false)
  const [allowedPages, setAllowedPages] = useState<string[]>([])
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut, currentRoleId, updateCurrentRole } = useAuth()

  const userFullName = (user?.user_metadata?.full_name ?? user?.user_metadata?.fullName ?? "").toString().trim()
  const userEmail = (user?.email ?? "").toString().trim()
  const userDisplayName = userFullName && userEmail ? `${userFullName} (${userEmail})` : userFullName || userEmail

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
        setRoles(rolesData || [])

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
          setAllowedPages(['/invoices', '/material-requests', '/contracts', '/approvals', '/admin'])
        }

      } catch (error) {
        console.error('[Layout] Error loading roles:', error)
      }
    }

    loadRoles()
  }, [user, currentRoleId])

  // Handle role change
  const handleRoleChange = async (roleId: number | null) => {
    if (!user?.id) return

    setChangingRole(true)

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role_id: roleId })
        .eq('id', user.id)

      if (error) throw error

      updateCurrentRole(roleId)

      // Update current role and allowed pages
      if (roleId) {
        const role = roles.find(r => r.id === roleId)
        if (role) {
          const pages = role.allowed_pages
            ? (typeof role.allowed_pages === 'string'
                ? JSON.parse(role.allowed_pages)
                : role.allowed_pages)
            : []
          setAllowedPages(pages)

          // Check if current page is still allowed
          if (pages.length > 0 && !pages.includes(location.pathname)) {
            // Redirect to first allowed page
            navigate(pages[0])
            message.warning('У вас нет доступа к этой странице с выбранной ролью')
          }
        }
      } else {
        // No role selected, allow all pages
        setAllowedPages(['/invoices', '/material-requests', '/contracts', '/approvals', '/admin'])
      }

      message.success('Роль изменена')

      // Reload page if on approvals page to refresh the list
      if (location.pathname === '/approvals') {
        window.location.reload()
      }
    } catch (error: any) {
      console.error('[Layout.handleRoleChange] Error:', error)
      message.error(error.message || 'Ошибка изменения роли')
    } finally {
      setChangingRole(false)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('[MainLayout.handleLogout] Logout error:', error)
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
      onClick: handleLogout,
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
      key: '/approvals',
      icon: <AuditOutlined />,
      label: 'Согласования',
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
      <Layout>
        <Header
          style={{
            padding: 0,
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingRight: 24,
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Quick role switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SafetyOutlined style={{ color: '#1890ff' }} />
              <Select
                value={currentRoleId || undefined}
                onChange={handleRoleChange}
                loading={changingRole}
                style={{ width: 200 }}
                placeholder="Выберите роль"
                allowClear
                options={roles.map(role => ({
                  value: role.id,
                  label: role.name
                }))}
              />
            </div>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar icon={<UserOutlined />} />
                <span>{userDisplayName}</span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: '#fff',
            borderRadius: 8,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
