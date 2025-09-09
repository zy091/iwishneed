import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User as SupaUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'developer' | 'submitter'
  rolename?: string
  role_id?: number
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void | Promise<void>
  setExternalUser: (u: User) => void
  loading: boolean
  error: string | null
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

  return {
    id: su.id,
    name: fullName || '用户',
    email: su.email ?? '',
    role: 'submitter', // 默认值，会被后续更新
    role_id: 4, // 默认值，会被后续更新
    rolename: '提交者', // 默认值，会被后续更新
    avatar
  }
}

// 直接查询 profiles 表获取用户信息
async function fetchUserProfile(userId: string): Promise<{ name: string; role_id: number } | null> {
  try {
    console.log('🔍 获取用户 profile:', userId)
    
    // 直接查询 profiles 表，不使用 RPC 函数
    const { data, error } = await supabase
      .from('profiles')
      .select('name, role_id')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('❌ 查询 profile 失败:', error)
      
      // 如果用户不存在，尝试创建
      if (error.code === 'PGRST116') {
        console.log('🔧 用户 profile 不存在，尝试创建...')
        
        const { data: authUser } = await supabase.auth.getUser()
        if (authUser.user) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              name: authUser.user.email?.split('@')[0] || '用户',
              role_id: 4 // 默认为提交者
            })
          
          if (insertError) {
            console.error('❌ 创建 profile 失败:', insertError)
            return null
          }
          
          console.log('✅ 成功创建用户 profile')
          return {
            name: authUser.user.email?.split('@')[0] || '用户',
            role_id: 4
          }
        }
      }
      return null
    }

    console.log('✅ 成功获取 profile:', data)
    return data
  } catch (error) {
    console.error('❌ 获取用户 profile 异常:', error)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // 更新用户信息
  const updateUserWithProfile = async (supaUser: SupaUser) => {
    try {
      setError(null)
      const baseUser = mapSupabaseUser(supaUser)
      
      // 先设置基础用户信息
      setUser(baseUser)
      setIsAuthenticated(true)
      
      // 异步获取完整的 profile 信息
      const profile = await fetchUserProfile(supaUser.id)
      
      if (profile) {
        const roleMap: Record<number, 'admin' | 'manager' | 'developer' | 'submitter'> = {
          0: 'admin',
          1: 'admin', 
          2: 'manager',
          3: 'developer',
          4: 'submitter'
        }

        const updatedUser: User = {
          ...baseUser,
          name: profile.name,
          role: roleMap[profile.role_id] || 'submitter',
          role_id: profile.role_id,
          rolename: ROLE_NAME_MAP[profile.role_id] || '提交者'
        }
        
        console.log('✅ 用户信息更新完成:', updatedUser)
        setUser(updatedUser)
      } else {
        console.warn('⚠️ 无法获取用户 profile，使用默认信息')
        setError('无法获取用户权限信息')
      }
    } catch (err: any) {
      console.error('❌ 更新用户信息失败:', err)
      setError(err.message || '获取用户信息失败')
    }
  }

  useEffect(() => {
    let mounted = true
    
    // 初始化会话
    const init = async () => {
      try {
        setLoading(true)
        setError(null)
        
        console.log('🚀 初始化认证状态...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('❌ 获取会话失败:', sessionError)
          setError(sessionError.message)
          if (mounted) {
            setUser(null)
            setIsAuthenticated(false)
          }
          return
        }
        
        if (session?.user && mounted) {
          console.log('✅ 发现活跃会话:', session.user.email)
          await updateUserWithProfile(session.user)
        } else {
          console.log('ℹ️ 无活跃会话')
          if (mounted) {
            setUser(null)
            setIsAuthenticated(false)
          }
        }
      } catch (error: any) {
        console.error('❌ 认证初始化失败:', error)
        if (mounted) {
          setError(error.message || '认证初始化失败')
          setUser(null)
          setIsAuthenticated(false)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    
    init()

    // 监听认证状态变化
    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      console.log('🔄 认证状态变化:', event, session?.user?.email)
      
      if (session?.user) {
        await updateUserWithProfile(session.user)
      } else {
        setUser(null)
        setIsAuthenticated(false)
        setError(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.subscription?.unsubscribe?.()
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null)
      setLoading(true)
      
      console.log('🔑 尝试登录:', email)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        console.error('❌ 登录失败:', error)
        setError(error.message)
        return false
      }
      
      if (data.user) {
        console.log('✅ 登录成功')
        return true
      }
      
      return false
    } catch (err: any) {
      console.error('❌ 登录异常:', err)
      setError(err.message || '登录失败')
      return false
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      setError(null)
      console.log('🚪 用户登出')
      await supabase.auth.signOut()
    } catch (err: any) {
      console.error('❌ 登出失败:', err)
      setError(err.message || '登出失败')
    }
  }

  const setExternalUser = (u: User) => {
    setUser(u)
    setIsAuthenticated(true)
    setError(null)
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      login, 
      logout, 
      setExternalUser,
      loading,
      error
    }}>
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