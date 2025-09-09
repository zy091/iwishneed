import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import type { Profile, Role, AuthError } from '@/types/auth'

/**
 * 企业级认证服务
 * 负责处理所有认证相关的业务逻辑
 */
export class AuthService {
  private static instance: AuthService
  private profileCache = new Map<string, Profile>()
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  /**
   * 获取用户配置文件
   * 包含缓存机制和错误重试
   */
  async fetchUserProfile(userId: string): Promise<Profile | null> {
    try {
      // 检查缓存
      const cached = this.profileCache.get(userId)
      if (cached) {
        return cached
      }

      // 首先尝试通过 user_id 查询
      let { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          role:roles(
            id,
            name,
            permissions
          )
        `)
        .eq('user_id', userId)
        .single()

      // 如果通过 user_id 查询失败，尝试通过 id 查询
      if (error && error.code === 'PGRST116') {
        const result = await supabase
          .from('profiles')
          .select(`
            *,
            role:roles(
              id,
              name,
              permissions
            )
          `)
          .eq('id', userId)
          .single()
        
        data = result.data
        error = result.error
      }

      if (error) {
        console.error('[AuthService] Failed to fetch profile:', error)
        return null
      }

      if (!data) {
        return null
      }

      const profile = data as Profile & { role: Role }
      
      // 缓存结果
      this.profileCache.set(userId, profile)
      
      // 设置缓存过期
      setTimeout(() => {
        this.profileCache.delete(userId)
      }, this.CACHE_TTL)

      return profile
    } catch (error) {
      console.error('[AuthService] Exception in fetchUserProfile:', error)
      return null
    }
  }

  /**
   * 创建默认用户配置文件
   */
  async createDefaultProfile(user: User): Promise<Profile> {
    const defaultProfile: Omit<Profile, 'id' | 'created_at' | 'updated_at'> = {
      name: user.email?.split('@')[0] || 'User',
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      role_id: 3, // 默认用户角色
      user_id: user.id,
      avatar_url: user.user_metadata?.avatar_url || null,
      department: null,
      position: null,
      phone: null
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert(defaultProfile)
        .select(`
          *,
          role:roles(
            id,
            name,
            permissions
          )
        `)
        .single()

      if (error) {
        throw new Error(`Failed to create profile: ${error.message}`)
      }

      return data as Profile & { role: Role }
    } catch (error) {
      console.error('[AuthService] Failed to create default profile:', error)
      
      // 返回临时配置文件
      return {
        id: user.id,
        ...defaultProfile,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        role: {
          id: 3,
          name: 'user',
          permissions: {}
        }
      } as Profile & { role: Role }
    }
  }

  /**
   * 登录
   */
  async signIn(email: string, password: string): Promise<{ user: User; profile: Profile }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      })

      if (error) {
        throw this.createAuthError(error.message, error.status)
      }

      if (!data.user) {
        throw this.createAuthError('登录失败：未获取到用户信息')
      }

      // 获取用户配置文件
      let profile = await this.fetchUserProfile(data.user.id)
      
      // 如果没有配置文件，创建默认配置文件
      if (!profile) {
        profile = await this.createDefaultProfile(data.user)
      }

      return { user: data.user, profile }
    } catch (error) {
      if (error instanceof Error) {
        throw this.createAuthError(error.message)
      }
      throw this.createAuthError('登录过程中发生未知错误')
    }
  }

  /**
   * 登出
   */
  async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw this.createAuthError(error.message)
      }
      
      // 清除缓存
      this.profileCache.clear()
    } catch (error) {
      console.error('[AuthService] Sign out error:', error)
      throw error
    }
  }

  /**
   * 获取当前会话
   */
  async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        throw this.createAuthError(error.message)
      }

      return session
    } catch (error) {
      console.error('[AuthService] Get session error:', error)
      return null
    }
  }

  /**
   * 刷新会话
   */
  async refreshSession() {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        throw this.createAuthError(error.message)
      }

      return data.session
    } catch (error) {
      console.error('[AuthService] Refresh session error:', error)
      return null
    }
  }

  /**
   * 检查用户权限
   */
  hasPermission(profile: Profile | null, permission: string): boolean {
    if (!profile?.role?.permissions) {
      return false
    }
    return profile.role.permissions[permission] === true
  }

  /**
   * 检查是否为管理员
   */
  isAdmin(profile: Profile | null): boolean {
    return profile?.role_id === 0 || profile?.role_id === 1
  }

  /**
   * 检查是否为超级管理员
   */
  isSuperAdmin(profile: Profile | null): boolean {
    return profile?.role_id === 0
  }

  /**
   * 创建认证错误
   */
  private createAuthError(message: string, status?: number): AuthError {
    const error = new Error(message) as AuthError
    error.name = 'AuthError'
    error.status = status
    return error
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.profileCache.clear()
  }
}

export const authService = AuthService.getInstance()