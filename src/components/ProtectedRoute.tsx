import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  requiredPath?: string
}

export function ProtectedRoute({ children, requiredPath }: ProtectedRouteProps) {
  const { user, userProfile, userRole, loading } = useAuth()

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
        <Spin size="large" />
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    console.log('[ProtectedRoute] User not authenticated, redirecting to login')
    return <Navigate to="/login" replace />
  }

  // Redirect to login if user is disabled
  if (userProfile?.is_disabled) {
    console.log('[ProtectedRoute] User is disabled, redirecting to login')
    return <Navigate to="/login" replace />
  }

  // Profile page is always accessible to all authenticated users
  if (requiredPath === '/profile') {
    console.log('[ProtectedRoute] Profile page - access granted')
    return <>{children}</>
  }

  // Check page access if user has a role with allowed_pages
  if (requiredPath && userRole?.allowed_pages) {
    // Parse allowed_pages if it's a string, otherwise use as is
    let allowedPages: string[] = []

    try {
      if (typeof userRole.allowed_pages === 'string') {
        allowedPages = JSON.parse(userRole.allowed_pages)
      } else if (Array.isArray(userRole.allowed_pages)) {
        allowedPages = userRole.allowed_pages
      }
    } catch (error) {
      console.error('[ProtectedRoute] Error parsing allowed_pages:', error)
      allowedPages = []
    }

    const hasAccess = allowedPages.includes(requiredPath)

    console.log('[ProtectedRoute] Checking page access:', {
      requiredPath,
      allowedPages,
      allowedPagesType: typeof userRole.allowed_pages,
      allowedPagesRaw: userRole.allowed_pages,
      hasAccess,
    })

    if (!hasAccess) {
      // If user has no access to this page, redirect to first allowed page or show error
      if (allowedPages.length > 0 && typeof allowedPages[0] === 'string') {
        const firstAllowedPage = allowedPages[0]
        console.log('[ProtectedRoute] Access denied, redirecting to:', firstAllowedPage)
        return <Navigate to={firstAllowedPage} replace />
      } else {
        console.log('[ProtectedRoute] User has no allowed pages or invalid format')
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
