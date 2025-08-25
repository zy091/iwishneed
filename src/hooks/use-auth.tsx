import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User as SupaUser } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { ENV } from '@/config/env'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'developer' | 'submitter'
  rolename?: string  // 主项目的角色名称，如"超级管理员"、"项目经理"
  role_id?: number   // 主项目的角色ID
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void | Promise<void>
  setExternalUser: (u: User) => void
}

const ROLE_NAME_MAP: Record<number, string> = {
  0: '超级管理员',
  1: '管理员',
  2: '经理',
  3: '开发者',
  4: '提交者',
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function mapSupabaseUser(su: SupaUser): User {
  const fullName =
    (su.user_metadata?.full_name as string | undefined) ||
    (su.user_metadata?.name as string | undefined) ||
    (su.email ? su.email.split('@')[0] : '用户')
  const avatar =
    (su.user_metadata?.avatar_url as string | undefined) ||
    (su.user_metadata?.picture as string | undefined)

  // 这里默认赋予一个演示角色。若需基于数据库或 JWT 分配角色，请扩展此处逻辑。
  return {
    id: su.id,
    name: fullName || '用户',
    email: su.email ?? '',
    role: 'manager',
    avatar
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)

  useEffect(() => {
    // 初始化会话
    const init = async () => {
      // SSO 模式优先恢复外部用户的本地状态，避免被 Supabase 空会话覆盖
      if (ENV.AUTH_MODE === 'sso') {
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser)
            if (!parsed.rolename && typeof parsed.role_id === 'number') {
              parsed.rolename = ROLE_NAME_MAP[parsed.role_id] || parsed.rolename
            }
            setUser(parsed)
            setIsAuthenticated(true)
            return
          } catch {
            // ignore parse error and continue
          }
        }
      }

      // 非 SSO 或未有本地外部用户时，再检查 Supabase 会话
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const u = mapSupabaseUser(session.user)
        setUser(u)
        setIsAuthenticated(true)
        localStorage.setItem('user', JSON.stringify(u))
      } else if (ENV.AUTH_MODE !== 'sso') {
        // 兼容已有本地存储（首次接入时不丢状态）
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          setUser(JSON.parse(storedUser))
          setIsAuthenticated(true)
        }
      }
    }
    init()

    // 监听认证状态变化
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (ENV.AUTH_MODE === 'sso') {
        // 在 SSO 模式下，完全忽略 Supabase 的会话事件，保留主项目传入的用户信息（rolename/role_id）
        return
      }
      if (session?.user) {
        const u = mapSupabaseUser(session.user)
        setUser(u)
        setIsAuthenticated(true)
        localStorage.setItem('user', JSON.stringify(u))
      } else {
        setUser(null)
        setIsAuthenticated(false)
        localStorage.removeItem('user')
      }
    })

    return () => {
      subscription.subscription?.unsubscribe?.()
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      return false
    }
    const u = mapSupabaseUser(data.user)
    setUser(u)
    setIsAuthenticated(true)
    localStorage.setItem('user', JSON.stringify(u))
    return true
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem('user')
  }

  const setExternalUser = (u: User) => {
    const enriched: User = {
      ...u,
      rolename:
        (u.rolename && u.rolename.trim()
          ? u.rolename
          : (typeof u.role_id === 'number' ? ROLE_NAME_MAP[u.role_id] : u.rolename)) || u.rolename,
    }
    setUser(enriched)
    setIsAuthenticated(true)
    localStorage.setItem('user', JSON.stringify(enriched))
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, setExternalUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}