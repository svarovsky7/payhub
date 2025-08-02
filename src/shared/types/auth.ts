import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

export const UserRole = {
  PROCUREMENT_OFFICER: 'PROCUREMENT_OFFICER',
  CONSTRUCTION_MANAGER: 'CONSTRUCTION_MANAGER', 
  DIRECTOR: 'DIRECTOR',
  ACCOUNTANT: 'ACCOUNTANT',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

export interface UserRoleEntity {
  id: number;
  code: UserRole;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface User extends SupabaseUser {
  role?: UserRole;
  role_id?: number;
  role_name?: string;
  full_name?: string;
}

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}