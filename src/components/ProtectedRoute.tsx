import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  requiredPath?: string
}

export function ProtectedRoute({ children, requiredPath }: ProtectedRouteProps) {
  const { user, userRole, loading } = useAuth()

  console.log('[ProtectedRoute] Checking access:', {
    user: user?.email,
    requiredPath,
    loading,
  })

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size="large" tip="Загрузка..." />
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log('[ProtectedRoute] User not authenticated, redirecting to login')
    return <Navigate to="/login" replace />
  }

  // Check page access if user has a role with allowed_pages
  if (requiredPath && userRole?.allowed_pages) {
    const allowedPages = userRole.allowed_pages as string[]
    const hasAccess = allowedPages.includes(requiredPath)

    console.log('[ProtectedRoute] Checking page access:', {
      requiredPath,
      allowedPages,
      hasAccess,
    })

    if (!hasAccess) {
      // If user has no access to this page, redirect to first allowed page or show error
      if (allowedPages.length > 0) {
        const firstAllowedPage = allowedPages[0]
        console.log('[ProtectedRoute] Access denied, redirecting to:', firstAllowedPage)
        return <Navigate to={firstAllowedPage} replace />
      } else {
        console.log('[ProtectedRoute] User has no allowed pages')
        return (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100vh',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <h1>Доступ запрещен</h1>
            <p>У вашей роли нет доступа ни к одной странице. Обратитесь к администратору.</p>
          </div>
        )
      }
    }
  }

  console.log('[ProtectedRoute] Access granted')
  return <>{children}</>
}
