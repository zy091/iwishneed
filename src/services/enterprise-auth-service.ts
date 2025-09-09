import { supabase } from '@/lib/supabaseClient'

export interface UserPermissions {
  userId: string
  name: string
  email: string
  roleId: number
  roleName: string
  permissions: {
    canComment: boolean
    canEdit: boolean
    canDelete: boolean
    canAdmin: boolean
    canManage: boolean
  }
  isAdmin: boolean
  canComment: boolean
  canEdit: boolean
  canDelete: boolean
}

/**
 * 企业级认证服务
 * 所有权限验证直接基于数据库，确保数据一致性和安全性
 */
export class EnterpriseAuthService {
  /**
   * 获取当前用户的完整权限信息
   * 直接从数据库获取，不依赖前端状态
   */
  static async getCurrentUserPermissions(): Promise<UserPermissions | null> {
    try {
      // 调用数据库 RPC 函数获取用户权限
      const { data, error } = await supabase.rpc('get_current_user_with_permissions')
      
      if (error) {
        console.warn('获取用户权限失败:', error.message)
        return null
      }
      
      if (!data) {
        console.warn('用户未认证或权限数据为空')
        return null
      }
      
      return data as UserPermissions
    } catch (error) {
      console.error('权限验证异常:', error)
      return null
    }
  }

  /**
   * 检查用户是否可以执行特定操作
   * @param action 操作类型
   * @param resourceId 资源ID（可选）
   */
  static async canPerformAction(
    action: 'comment_create' | 'comment_edit' | 'comment_delete' | 'admin_access',
    resourceId?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('check_user_permission', {
        action_name: action,
        resource_id: resourceId || null
      })
      
      if (error) {
        console.warn('权限检查失败:', error.message)
        return false
      }
      
      return data === true
    } catch (error) {
      console.error('权限检查异常:', error)
      return false
    }
  }

  /**
   * 获取当前用户的基本信息（轻量级）
   */
  static async getCurrentUser(): Promise<{ id: string; email: string } | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return null
      }
      
      return {
        id: user.id,
        email: user.email || ''
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      return null
    }
  }

  /**
   * 刷新用户会话
   */
  static async refreshSession(): Promise<boolean> {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('刷新会话失败:', error.message)
        return false
      }
      
      return !!data.session
    } catch (error) {
      console.error('刷新会话异常:', error)
      return false
    }
  }

  /**
   * 检查用户是否已认证
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      return !!user
    } catch (error) {
      console.error('认证检查失败:', error)
      return false
    }
  }

  /**
   * 获取用户会话信息（调试用）
   */
  static async getSessionInfo(): Promise<any> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      return {
        session,
        error,
        isValid: !!session,
        expiresAt: session?.expires_at ? new Date(session.expires_at * 1000) : null
      }
    } catch (error) {
      console.error('获取会话信息失败:', error)
      return {
        session: null,
        error,
        isValid: false,
        expiresAt: null
      }
    }
  }
}

/**
 * React Hook: 企业级认证状态管理
 * 基于数据库权限验证，确保状态准确性
 */
import { useState, useEffect } from 'react'

export function useEnterpriseAuth() {
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkAuth = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const permissions = await EnterpriseAuthService.getCurrentUserPermissions()
      setUserPermissions(permissions)
    } catch (err) {
      console.error('认证检查失败:', err)
      setError(err instanceof Error ? err.message : '认证检查失败')
      setUserPermissions(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    // 初始检查
    checkAuth()

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          console.log('认证状态变化:', event, !!session)
          await checkAuth()
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return {
    user: userPermissions,
    isAuthenticated: !!userPermissions,
    loading,
    error,
    canComment: userPermissions?.canComment || false,
    canEdit: userPermissions?.canEdit || false,
    canDelete: userPermissions?.canDelete || false,
    isAdmin: userPermissions?.isAdmin || false,
    refresh: checkAuth
  }
}