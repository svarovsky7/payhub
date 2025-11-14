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
  let allowedPages: string[] = []

  if (userRole) {
    try {
      if (typeof userRole.allowed_pages === 'string') {
        const parsed = JSON.parse(userRole.allowed_pages)
        allowedPages = Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : []
      } else if (Array.isArray(userRole.allowed_pages)) {
        allowedPages = userRole.allowed_pages.filter((p): p is string => typeof p === 'string')
      }
    } catch (error) {
      console.error('[ProtectedRoute] Error parsing allowed_pages:', error)
      allowedPages = []
    }
  }

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

  if (requiredPath && userRole) {
    const hasAccess = allowedPages.includes(requiredPath)

    console.log('[ProtectedRoute] Checking page access:', {
      requiredPath,
      allowedPages,
      allowedPagesType: typeof userRole.allowed_pages,
      allowedPagesRaw: userRole.allowed_pages,
      hasAccess,
    })

    if (allowedPages.length === 0) {
      console.log('[ProtectedRoute] Role has no allowed pages configured')
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
          <p>Для вашей роли не настроены доступные страницы. Обратитесь к администратору.</p>
        </div>
      )
    }

    if (!hasAccess) {
      if (allowedPages.length > 0) {
        const firstAllowedPage = allowedPages[0]
        console.log('[ProtectedRoute] Access denied, redirecting to:', firstAllowedPage)
        return <Navigate to={firstAllowedPage} replace />
      }
    }
  }

  console.log('[ProtectedRoute] Access granted')
  return <>{children}</>
}
