import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Result, Spin, Layout, Avatar, Dropdown, Button, Space } from 'antd'
import { UserOutlined, LogoutOutlined } from '@ant-design/icons'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const { Header, Content } = Layout

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPath?: string
}

const AccessDeniedPage: React.FC = () => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const userFullName = (user?.user_metadata?.full_name ?? user?.user_metadata?.fullName ?? "").toString().trim()
  const userEmail = (user?.email ?? "").toString().trim()
  const userDisplayName = userFullName || userEmail || 'Пользователь'

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выход',
      onClick: handleLogout
    }
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <div style={{ fontSize: '18px', fontWeight: 500 }}>
          PayHub
        </div>

        <Dropdown
          menu={{ items: userMenuItems }}
          trigger={['click']}
        >
          <Space style={{ cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
            <span>{userDisplayName}</span>
          </Space>
        </Dropdown>
      </Header>

      <Content style={{
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 64px)'
      }}>
        <Result
          status="403"
          title="403"
          subTitle="У вас нет доступа к этой странице. Обратитесь к администратору для получения необходимых прав."
          extra={
            <Button type="primary" onClick={handleLogout}>
              Выйти из системы
            </Button>
          }
        />
      </Content>
    </Layout>
  )
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPath }) => {
  const { user, currentRoleId, loading: authLoading } = useAuth()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [allowedPages, setAllowedPages] = useState<string[]>([])

  useEffect(() => {
    const checkAccess = async () => {
      // Wait for auth to finish loading before checking access
      if (authLoading) {
        return
      }

      if (!user) {
        setLoading(false)
        setHasAccess(false)
        return
      }

      // If no role is assigned, deny access to protected pages
      // SECURITY: Never allow access without a valid role
      if (!currentRoleId) {
        setLoading(false)
        setHasAccess(false)
        return
      }

      try {
        // Load role with allowed pages
        const { data: roleData, error } = await supabase
          .from('roles')
          .select('allowed_pages')
          .eq('id', currentRoleId)
          .single()

        if (error) throw error

        if (roleData) {
          // Parse allowed_pages
          const pages = roleData.allowed_pages
            ? (typeof roleData.allowed_pages === 'string'
                ? JSON.parse(roleData.allowed_pages)
                : roleData.allowed_pages)
            : []

          setAllowedPages(pages)

          // Check if current path or required path is in allowed pages
          const pathToCheck = requiredPath || location.pathname

          // Check exact match or if it's a subpath (e.g., /admin/users matches /admin)
          // If pages array is empty, deny access (no pages allowed)
          const isAllowed = pages.length > 0 &&
            pages.some((page: string) =>
              pathToCheck === page ||
              pathToCheck.startsWith(page + '/')
            )

          setHasAccess(isAllowed)
        }
      } catch (error) {
        console.error('[ProtectedRoute] Error checking access:', error)
        setHasAccess(false)
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [user, currentRoleId, location.pathname, requiredPath, authLoading])

  // Show loading spinner while checking access or auth is loading
  if (loading || authLoading) {
    return (
      <Spin
        size="large"
        spinning={true}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          width: '100%'
        }}
      />
    )
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If no access, show error or redirect
  if (!hasAccess) {
    // If user has allowed pages, redirect to the first one
    if (allowedPages.length > 0) {
      return <Navigate to={allowedPages[0]} replace />
    }

    // Otherwise show access denied message with header
    return (
      <AccessDeniedPage />
    )
  }

  // User has access, render children
  return <>{children}</>
}