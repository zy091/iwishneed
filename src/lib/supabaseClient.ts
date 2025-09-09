import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey
  })
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// 创建 Supabase 客户端 - 企业级配置
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: import.meta.env.DEV
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'requirement-management-system'
    }
  }
})

// 添加全局错误处理
supabase.auth.onAuthStateChange((event, session) => {
  if (import.meta.env.DEV) {
    console.log('[Supabase] Auth event:', event, { hasSession: !!session })
  }
})

// 数据库类型定义
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
  permissions: Record<string, any>
}

export interface Comment {
  id: string
  requirement_id: string
  content: string
  user_external_id: string
  user_email: string
  created_at: string
  updated_at: string
  parent_id?: string | null
  attachments_count: number
  user_id?: string | null
}

// 权限检查函数
export const hasPermission = (profile: Profile | null, permission: string): boolean => {
  if (!profile?.role) return false
  return profile.role.permissions[permission] === true
}

// 角色检查函数
export const isAdmin = (profile: Profile | null): boolean => {
  return profile?.role_id === 0 // 超级管理员
}

export const isSuperAdmin = (profile: Profile | null): boolean => {
  return profile?.role_id === 0
}

export default supabase