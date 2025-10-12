import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  currentRoleId: number | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  updateCurrentRole: (roleId: number | null) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentRoleId, setCurrentRoleId] = useState<number | null>(null)

  // Extract role loading logic to a separate function to reuse
  const loadUserRole = useCallback(async (userId: string) => {
    console.log('[AuthProvider.loadUserRole] Loading role for user:', userId)
    try {
      const { data: userData } = await supabase
        .from('user_profiles')
        .select('role_id')
        .eq('id', userId)
        .maybeSingle()

      console.log('[AuthProvider.loadUserRole] Role loaded:', userData?.role_id)
      setCurrentRoleId(userData?.role_id || null)
    } catch (error) {
      console.error('[AuthProvider.loadUserRole] Error loading user role:', error)
      setCurrentRoleId(null)
    }
  }, [])

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)

      // Load current user role
      if (session?.user) {
        await loadUserRole(session.user.id)
      }

      setLoading(false)
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('[AuthProvider.onAuthStateChange] Auth state changed, event:', _event, 'User:', session?.user?.id)

      // Set loading to true while we load user data
      console.log('[AuthProvider.onAuthStateChange] Setting loading to true')
      setLoading(true)
      setUser(session?.user ?? null)

      // CRITICAL FIX: Also load role when auth state changes
      if (session?.user) {
        console.log('[AuthProvider.onAuthStateChange] Loading role for user:', session.user.id)
        await loadUserRole(session.user.id)
      } else {
        console.log('[AuthProvider.onAuthStateChange] No user, clearing role')
        setCurrentRoleId(null)
      }

      // Mark loading complete after role is loaded
      console.log('[AuthProvider.onAuthStateChange] Setting loading to false')
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) {
      console.error('[AuthProvider.signIn] Login failed:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    })
    if (error) {
      console.error('[AuthProvider.signUp] Registration failed:', error)
      throw error
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('[AuthProvider.signOut] Logout failed:', error)
      throw error
    }
  }

  const updateCurrentRole = (roleId: number | null) => {
    setCurrentRoleId(roleId)
  }

  return (
    <AuthContext.Provider value={{ user, loading, currentRoleId, signIn, signUp, signOut, updateCurrentRole }}>
      {children}
    </AuthContext.Provider>
  )
}