import type { User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { authService } from '@/services/auth.service'
import type { AuthContextType, AuthState, Profile } from '@/types/auth'

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// 初始状态
const initialState: AuthState = {
  user: null,
  profile: null,
  loading: true,
  error: null,
  initialized: false
}

/**
 * 企业级认证提供者组件
 * 负责管理全局认证状态和会话
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState)

  // 更新状态的辅助函数
  const updateState = useCallback((updates: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  // 清除错误
  const clearError = useCallback(() => {
    updateState({ error: null })
  }, [updateState])

  // 处理认证状态变化
  const handleAuthStateChange = useCallback(async (event: string, session: any) => {
    console.log(`[Auth] Event: ${event}`, { hasSession: !!session })

    try {
      if (session?.user) {
        // 用户已登录，获取配置文件
        updateState({ loading: true, error: null })
        
        let profile = await authService.fetchUserProfile(session.user.id)
        
        // 如果没有配置文件，创建默认配置文件
        if (!profile) {
          console.log('[Auth] Creating default profile for user')
          profile = await authService.createDefaultProfile(session.user)
        }

        updateState({
          user: session.user,
          profile,
          loading: false,
          initialized: true
        })
      } else {
        // 用户未登录
        updateState({
          user: null,
          profile: null,
          loading: false,
          initialized: true
        })
      }
    } catch (error) {
      console.error('[Auth] Error handling auth state change:', error)
      updateState({
        error: error instanceof Error ? error.message : '认证过程中发生错误',
        loading: false,
        initialized: true
      })
    }
  }, [updateState])

  // 登录函数
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      updateState({ loading: true, error: null })
      
      const { user, profile } = await authService.signIn(email, password)
      
      updateState({
        user,
        profile,
        loading: false,
        error: null
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '登录失败'
      updateState({
        error: errorMessage,
        loading: false
      })
      throw error
    }
  }, [updateState])

  // 登出函数
  const signOut = useCallback(async () => {
    try {
      updateState({ loading: true, error: null })
      
      await authService.signOut()
      
      updateState({
        user: null,
        profile: null,
        loading: false,
        error: null
      })
      
      // 重定向到首页
      window.location.href = '/'
    } catch (error) {
      console.error('[Auth] Sign out error:', error)
      updateState({
        error: error instanceof Error ? error.message : '登出失败',
        loading: false
      })
    }
  }, [updateState])

  // 初始化认证状态
  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // 获取当前会话
        const session = await authService.getCurrentSession()
        
        if (mounted) {
          await handleAuthStateChange('INITIAL_SESSION', session)
        }
      } catch (error) {
        console.error('[Auth] Initialization error:', error)
        if (mounted) {
          updateState({
            error: '认证初始化失败',
            loading: false,
            initialized: true
          })
        }
      }
    }

    // 设置认证状态监听器
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          handleAuthStateChange(event, session)
        }
      }
    )

    // 初始化认证状态
    initializeAuth()

    // 设置超时保护
    const timeoutId = setTimeout(() => {
      if (mounted && state.loading) {
        console.warn('[Auth] Initialization timeout, unlocking app')
        updateState({
          loading: false,
          initialized: true,
          error: '认证初始化超时，请刷新页面重试'
        })
      }
    }, 10000) // 10秒超时

    // 清理函数
    return () => {
      mounted = false
      subscription.unsubscribe()
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [handleAuthStateChange, updateState, state.loading])

  // 计算派生状态
  const isAdmin = authService.isAdmin(state.profile)
  const isSuperAdmin = authService.isSuperAdmin(state.profile)

  // 上下文值
  const contextValue: AuthContextType = {
    ...state,
    signIn,
    signOut,
    clearError,
    isAdmin,
    isSuperAdmin
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * 使用认证上下文的Hook
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

export default useAuth