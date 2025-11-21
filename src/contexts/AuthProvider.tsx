import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { message } from 'antd'
import type { Role, UserProfile } from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { AuthContext, type AuthContextType } from './AuthContext'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userRole, setUserRole] = useState<Role | null>(null)
  const [currentRoleId, setCurrentRoleId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const loadedUserIdRef = useRef<string | null>(null)

  console.log('[AuthContext] Render', {
    user: user?.email || 'none',
    loading,
    hasProfile: !!userProfile,
    hasRole: !!userRole,
    loadedUserId: loadedUserIdRef.current
  })

  const loadUserProfile = useCallback(async (userId: string, skipIfLoaded: boolean = false) => {
    if (skipIfLoaded && loadedUserIdRef.current === userId) {
      console.log('[AuthContext.loadUserProfile] Profile already loaded, skipping', { userId })
      return
    }

    console.log('[AuthContext.loadUserProfile] Loading profile for:', userId)
    setLoading(true)
    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) throw profileError

      if (profile?.is_disabled) {
        console.log('[AuthContext.loadUserProfile] User is disabled, signing out')
        await supabase.auth.signOut()
        message.error('Ваш доступ к системе заблокирован')
        setUserProfile(null)
        setUserRole(null)
        setLoading(false)
        return
      }

      console.log('[AuthContext.loadUserProfile] Profile loaded:', profile?.email)
      setUserProfile(profile)
      setCurrentRoleId(profile?.role_id || null)
      loadedUserIdRef.current = userId

      if (profile?.role_id) {
        const { data: role, error: roleError } = await supabase
          .from('roles')
          .select('*')
          .eq('id', profile.role_id)
          .maybeSingle()

        if (roleError) {
          console.error('[AuthContext.loadUserProfile] Error loading role:', roleError)
        } else {
          console.log('[AuthContext.loadUserProfile] Role loaded:', role?.name)
          setUserRole(role)
        }
      } else {
        setUserRole(null)
      }
    } catch (error) {
      console.error('[AuthContext.loadUserProfile] Error:', error)
      message.error('Ошибка загрузки профиля пользователя')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    console.log('[AuthContext.useEffect] Checking session...')

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AuthContext.useEffect] Session:', session?.user?.email || 'none')
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[AuthContext.onAuthStateChange] Event:', _event, 'User:', session?.user?.email || 'none')
      setUser(session?.user ?? null)
      if (session?.user) {
        const skipReload = _event === 'SIGNED_IN'
        loadUserProfile(session.user.id, skipReload)
      } else {
        setUserProfile(null)
        setUserRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadUserProfile])

  const signIn = async (email: string, password: string) => {
    console.log('[AuthContext.signIn] Signing in:', email)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_disabled')
        .eq('id', data.user.id)
        .single()

      if (profile?.is_disabled) {
        await supabase.auth.signOut()
        throw new Error('Ваш доступ к системе заблокирован')
      }

      console.log('[AuthContext.signIn] Success:', data.user?.email)
      message.success('Вход выполнен успешно')
    } catch (error: unknown) {
      console.error('[AuthContext.signIn] Error:', error)
      if (error && typeof error === 'object' && 'message' in error) {
        message.error(`Ошибка входа: ${error.message as string}`)
      } else {
        message.error('Ошибка входа')
      }
      throw error
    }
  }

  const signUp = async (email: string, password: string, fullName: string, projectIds: number[]) => {
    console.log('[AuthContext.signUp] Signing up:', email, 'Projects:', projectIds)
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Не удалось создать пользователя')

      console.log('[AuthContext.signUp] Auth user created:', authData.user.id)

      await supabase.auth.signOut()

      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: authData.user.id,
          email,
          full_name: fullName,
          role_id: 9,
          is_disabled: true,
        }, {
          onConflict: 'id'
        })

      if (profileError) throw profileError

      console.log('[AuthContext.signUp] Profile created/updated with clerk role')

      if (projectIds.length > 0 && authData.user) {
        const userProjectsData = projectIds.map((projectId) => ({
          user_id: authData.user!.id,
          project_id: projectId,
        }))

        const { error: projectsError } = await supabase
          .from('user_projects')
          .insert(userProjectsData)

        if (projectsError) throw projectsError

        console.log('[AuthContext.signUp] Projects linked:', projectIds.length)
      }

      message.success('Регистрация успешна! Ожидайте активации доступа администратором.')
    } catch (error: unknown) {
      console.error('[AuthContext.signUp] Error:', error)

      await supabase.auth.signOut()

      if (error && typeof error === 'object' && 'message' in error) {
        message.error(`Ошибка регистрации: ${error.message as string}`)
      } else {
        message.error('Ошибка регистрации')
      }
      throw error
    }
  }

  const signOut = async () => {
    console.log('[AuthContext.signOut] Signing out...')
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      console.log('[AuthContext.signOut] Success')
      message.success('Выход выполнен')
    } catch (error: unknown) {
      console.error('[AuthContext.signOut] Error:', error)
      if (error && typeof error === 'object' && 'message' in error) {
        message.error(`Ошибка выхода: ${error.message as string}`)
      } else {
        message.error('Ошибка выхода')
      }
      throw error
    }
  }

  const updateCurrentRole = (roleId: number | null) => {
    console.log('[AuthContext.updateCurrentRole] Updating role to:', roleId)
    setCurrentRoleId(roleId)

    if (roleId) {
      supabase
        .from('roles')
        .select('*')
        .eq('id', roleId)
        .maybeSingle()
        .then(({ data: role, error }) => {
          if (error) {
            console.error('[AuthContext.updateCurrentRole] Error loading role:', error)
          } else {
            setUserRole(role)
          }
        })
    } else {
      setUserRole(null)
    }
  }

  const value: AuthContextType = {
    user,
    userProfile,
    userRole,
    currentRoleId,
    loading,
    signIn,
    signUp,
    signOut,
    updateCurrentRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

