import { createContext, useContext, useEffect, useState } from 'react'
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

  console.log('[AuthContext] Initializing...')

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
        loadUserProfile(session.user.id)
      } else {
        setUserProfile(null)
        setUserRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadUserProfile = async (userId: string) => {
    console.log('[AuthContext.loadUserProfile] Loading profile for:', userId)
    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) throw profileError

      console.log('[AuthContext.loadUserProfile] Profile loaded:', profile?.email)
      setUserProfile(profile)
      setCurrentRoleId(profile?.role_id || null)

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
  }

  const signIn = async (email: string, password: string) => {
    console.log('[AuthContext.signIn] Signing in:', email)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

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

      // Create or update user profile with default guest role (id=4)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: authData.user.id,
          email,
          full_name: fullName,
          role_id: 4, // Default guest role
        }, {
          onConflict: 'id'
        })

      if (profileError) throw profileError

      console.log('[AuthContext.signUp] Profile created/updated with guest role')

      // Link user to projects
      if (projectIds.length > 0) {
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

      // Reload user profile to get the assigned role
      await loadUserProfile(authData.user.id)

      message.success('Регистрация успешна! Добро пожаловать!')
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
