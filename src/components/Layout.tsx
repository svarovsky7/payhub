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
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [changingRole, setChangingRole] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut, currentRoleId, updateCurrentRole } = useAuth()

  const userFullName = (user?.user_metadata?.full_name ?? user?.user_metadata?.fullName ?? "").toString().trim()
  const userEmail = (user?.email ?? "").toString().trim()
  const userDisplayName = userFullName && userEmail ? `${userFullName} (${userEmail})` : userFullName || userEmail

  // Load roles
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

        console.log('[Layout] Loaded roles')
      } catch (error) {
        console.error('[Layout] Error loading roles:', error)
      }
    }

    loadRoles()
  }, [user])

  // Handle role change
  const handleRoleChange = async (roleId: number | null) => {
    if (!user?.id) return

    console.log('[Layout.handleRoleChange] Changing role to:', roleId)
    setChangingRole(true)

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role_id: roleId })
        .eq('id', user.id)

      if (error) throw error

      updateCurrentRole(roleId)
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
    console.log('[MainLayout.handleLogout] Logging out')
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

  const menuItems = [
    {
      key: '/invoices',
      icon: <FileTextOutlined />,
      label: 'Счета',
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

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
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
            console.log('[MainLayout.Menu] Navigating to:', key)
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
                value={currentRoleId}
                onChange={handleRoleChange}
                loading={changingRole}
                style={{ width: 200 }}
                placeholder="Выберите роль"
                allowClear
                options={[
                  { value: null, label: 'Без роли' },
                  ...roles.map(role => ({
                    value: role.id,
                    label: role.name
                  }))
                ]}
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
