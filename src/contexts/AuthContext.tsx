import React, { createContext, useContext, useEffect, useState } from 'react'
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

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)

      // Load current user role
      if (session?.user) {
        try {
          const { data: userData } = await supabase
            .from('user_profiles')
            .select('role_id')
            .eq('id', session.user.id)
            .maybeSingle()

          setCurrentRoleId(userData?.role_id || null)
        } catch (error) {
          console.error('[AuthProvider] Error loading user role:', error)
          setCurrentRoleId(null)
        }
      }

      setLoading(false)
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
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