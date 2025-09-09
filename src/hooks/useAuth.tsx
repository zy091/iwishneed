import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, Profile, Role } from '../lib/supabaseClient'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  isAdmin: boolean
  isSuperAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取用户资料
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          role:roles(*)
        `)
        .eq('id', userId)
        .single()

      if (error) {
        console.error('获取用户资料失败:', error)
        return null
      }

      return data as Profile & { role: Role }
    } catch (err) {
      console.error('获取用户资料异常:', err)
      return null
    }
  }

  // 初始化认证状态
  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        // 获取当前会话
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('获取会话失败:', sessionError)
          setError(sessionError.message)
          return
        }

        if (session?.user && mounted) {
          setUser(session.user)
          const userProfile = await fetchProfile(session.user.id)
          if (userProfile && mounted) {
            setProfile(userProfile)
          }
        }
      } catch (err) {
        console.error('初始化认证失败', err)
        setError(err instanceof Error ? err.message : '认证初始化失败')
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (import.meta.env.DEV) {
          console.log('认证状态变化', event, session?.user?.email)
        }

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          const userProfile = await fetchProfile(session.user.id)
          if (userProfile && mounted) {
            setProfile(userProfile)
          }
          setError(null)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          setError(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // 登录
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      if (data.user) {
        setUser(data.user)
        const userProfile = await fetchProfile(data.user.id)
        if (userProfile) {
          setProfile(userProfile)
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  // 登出
  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      setProfile(null)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : '登出失败'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  // 权限检查
  const isAdmin = profile?.role_id === 1 || profile?.role_id === 0
  const isSuperAdmin = profile?.role_id === 0

  const value: AuthContextType = {
    user,
    profile,
    loading,
    error,
    signIn,
    signOut,
    isAdmin,
    isSuperAdmin,
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

export default useAuth