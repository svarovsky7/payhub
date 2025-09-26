import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Result, Spin } from 'antd'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPath?: string
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPath }) => {
  const { user, currentRoleId } = useAuth()
  const location = useLocation()
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [allowedPages, setAllowedPages] = useState<string[]>([])

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setLoading(false)
        setHasAccess(false)
        return
      }

      // If no role is selected, allow access to all pages
      if (!currentRoleId) {
        setLoading(false)
        setHasAccess(true)
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
          const isAllowed = pages.length === 0 || // No restrictions
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
  }, [user, currentRoleId, location.pathname, requiredPath])

  // Show loading spinner while checking access
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Проверка доступа..." />
      </div>
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

    // Otherwise show access denied message
    return (
      <Result
        status="403"
        title="403"
        subTitle="У вас нет доступа к этой странице. Обратитесь к администратору для получения необходимых прав."
      />
    )
  }

  // User has access, render children
  return <>{children}</>
}