import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Role, UserProfile } from '../lib/supabase'

export interface AuthContextType {
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

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

