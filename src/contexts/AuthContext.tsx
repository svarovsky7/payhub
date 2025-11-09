import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { UserProfile, Role } from '../lib/supabase'
import { message } from 'antd'

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  userRole: Role | null
  currentRoleId: number | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string, projectIds: number[]) => Promise<void>
  signOut: () => Promise<void>
  updateCurrentRole: (roleId: number | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
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
    // Skip if already loaded (to prevent duplicate loads on SIGNED_IN events)
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

      // Check if user is disabled
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

      // Load user role if available
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

    // Check active sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AuthContext.useEffect] Session:', session?.user?.email || 'none')
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[AuthContext.onAuthStateChange] Event:', _event, 'User:', session?.user?.email || 'none')
      setUser(session?.user ?? null)
      if (session?.user) {
        // Skip reload on SIGNED_IN events if user is already loaded
        const skipReload = _event === 'SIGNED_IN'
        loadUserProfile(session.user.id, skipReload)
      } else {
        setUserProfile(null)
        setUserRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Disabled realtime subscription - server not available
  // Profile changes will be detected on next page load
  /*
  useEffect(() => {
    if (!user?.id) return

    let mounted = true

    const channel = supabase
      .channel('user_profile_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (!mounted) return
          console.log('[AuthContext] Profile changed:', payload)
          const newProfile = payload.new as UserProfile
          
          if (newProfile.is_disabled) {
            console.log('[AuthContext] User disabled, signing out')
            message.error('Ваш доступ к системе заблокирован')
            supabase.auth.signOut()
          } else {
            loadUserProfile(user.id)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('[AuthContext] Realtime unavailable - continuing')
        }
      })

    return () => {
      mounted = false
      supabase.removeChannel(channel).catch(() => {})
    }
  }, [user?.id, loadUserProfile])
  */

  const signIn = async (email: string, password: string) => {
    console.log('[AuthContext.signIn] Signing in:', email)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Check if user is disabled
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
        message.error(`Ошибка входа: ${error.message}`)
      } else {
        message.error('Ошибка входа')
      }
      throw error
    }
  }

  const signUp = async (email: string, password: string, fullName: string, projectIds: number[]) => {
    console.log('[AuthContext.signUp] Signing up:', email, 'Projects:', projectIds)
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Не удалось создать пользователя')

      console.log('[AuthContext.signUp] Auth user created:', authData.user.id)

      // Sign out immediately to prevent auto-login
      await supabase.auth.signOut()

      // Create or update user profile with default clerk role (id=9)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: authData.user.id,
          email,
          full_name: fullName,
          role_id: 9, // Default clerk role
          is_disabled: true, // Block access by default
        }, {
          onConflict: 'id'
        })

      if (profileError) throw profileError

      console.log('[AuthContext.signUp] Profile created/updated with clerk role')

      // Link user to projects
      if (projectIds.length > 0 && authData.user) {
        const userProjectsData = projectIds.map(projectId => ({
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

      // Sign out on error to clean up state
      await supabase.auth.signOut()

      if (error && typeof error === 'object' && 'message' in error) {
        message.error(`Ошибка регистрации: ${error.message}`)
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
        message.error(`Ошибка выхода: ${error.message}`)
      } else {
        message.error('Ошибка выхода')
      }
      throw error
    }
  }

  const updateCurrentRole = (roleId: number | null) => {
    console.log('[AuthContext.updateCurrentRole] Updating role to:', roleId)
    setCurrentRoleId(roleId)

    // Update userRole if roleId is provided
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

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
