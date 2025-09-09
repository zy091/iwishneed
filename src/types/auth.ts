import type { User } from '@supabase/supabase-js'

export interface Profile {
  id: string
  name: string | null
  full_name: string | null
  role_id: number
  role?: Role
  created_at: string
  updated_at: string
  user_id?: string | null
  avatar_url?: string | null
  department?: string | null
  position?: string | null
  phone?: string | null
}

export interface Role {
  id: number
  name: string
  permissions: Record<string, boolean>
}

export interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
  initialized: boolean
}

export interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
  isAdmin: boolean
  isSuperAdmin: boolean
}

export type AuthEvent = 
  | 'SIGNED_IN'
  | 'SIGNED_OUT' 
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY'

export interface AuthError extends Error {
  code?: string
  status?: number
}