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
}

const ROLE_NAME_MAP: Record<number, string> = {
  0: '超级管理�?,
  1: '管理�?,
  2: '经理',
  3: '开发�?,
  4: '提交�?,
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
    role: 'submitter',
    role_id: 4,
    rolename: '提交�?,
    avatar
  }
}

// 异步更新用户 profile 信息
async function updateUserProfile(userId: string, setUser: (user: User | null) => void, currentUser: User) {
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_current_user_profile')
    let profileData: any | null = null
    if (!rpcError && rpcData) {
      if (Array.isArray(rpcData) && rpcData.length > 0) profileData = rpcData[0]
      else if (!Array.isArray(rpcData)) profileData = rpcData as any
    }
    if (rpcError || !profileData) {
      const { data: row, error: pErr } = await supabase.from('profiles').select('name, role_id').eq('id', userId).maybeSingle()
      if (!pErr && row) profileData = row as any
    }
    
    if (rpcError) {
      console.warn('Failed to fetch user profile via RPC:', rpcError.message)
    }
    
    if (profileData) {
      const role_id = profileData.role_id ?? 4
      const profileName = profileData.name || currentUser.name
      const rolename = profileData.rolename || ROLE_NAME_MAP[role_id] || '提交�?
      
      const roleMap: Record<number, 'admin' | 'manager' | 'developer' | 'submitter'> = {
        0: 'admin',
        1: 'admin',
        2: 'manager',
        3: 'developer',
        4: 'submitter'
      }

      const updatedUser: User = {
        ...currentUser,
        name: profileName,
        role: roleMap[role_id] || 'submitter',
        role_id,
        rolename
      }
      
      setUser(updatedUser)
    }
  } catch (error) {
    console.warn('Failed to fetch user profile:', error)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)

  useEffect(() => {
    // 初始化会�?
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          const u = mapSupabaseUser(session.user)
          setUser(u)
          setIsAuthenticated(true)
          updateUserProfile(session.user.id, setUser, u)
        } else {
          setUser(null)
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
        setUser(null)
        setIsAuthenticated(false)
      }
    }
    init()

    // 监听认证状态变�?
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const u = mapSupabaseUser(session.user)
        setUser(u)
        setIsAuthenticated(true)
        updateUserProfile(session.user.id, setUser, u)
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
    })

    return () => {
      subscription.subscription?.unsubscribe?.()
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return !error && !!data.user
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  const setExternalUser = (u: User) => {
    setUser(u)
    setIsAuthenticated(true)
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
