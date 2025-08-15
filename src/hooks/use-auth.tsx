import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User as SupaUser } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'developer' | 'submitter'
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void | Promise<void>
  setExternalUser: (u: User) => void
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
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const u = mapSupabaseUser(session.user)
        setUser(u)
        setIsAuthenticated(true)
        localStorage.setItem('user', JSON.stringify(u))
      } else {
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
    setUser(u)
    setIsAuthenticated(true)
    localStorage.setItem('user', JSON.stringify(u))
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