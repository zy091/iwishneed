import { supabase } from '@/lib/supabaseClient'

export interface UserPermissions {
  userId: string
  name: string
  email: string
  roleId: number
  roleName: string
  isAdmin: boolean
  canComment: boolean
  canEdit: boolean
  canDelete: boolean
}

export class FixedAuthService {
  /**
   * 获取当前用户权限信息 - 修复版本
   */
  static async getCurrentUserPermissions(): Promise<UserPermissions | null> {
    try {
      // 1. 首先检查认证状态
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('获取会话失败:', sessionError)
        return null
      }

      if (!session?.user) {
        console.log('用户未登录')
        return null
      }

      const user = session.user
      console.log('当前登录用户:', user.email, user.id)

      // 2. 查询用户 profile 信息
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          role_id,
          roles:role_id (
            id,
            name,
            permissions
          )
        `)
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('查询用户 profile 失败:', profileError)
        
        // 如果 profile 不存在，创建默认 profile
        if (profileError.code === 'PGRST116') {
          console.log('用户 profile 不存在，创建默认 profile')
          
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              name: user.user_metadata?.full_name || user.email?.split('@')[0] || '用户',
              role_id: 3, // 默认开发者角色
              user_id: user.id,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '用户'
            })
            .select(`
              id,
              name,
              role_id,
              roles:role_id (
                id,
                name,
                permissions
              )
            `)
            .single()

          if (createError) {
            console.error('创建用户 profile 失败:', createError)
            return null
          }

          console.log('成功创建用户 profile:', newProfile)
          return this.buildUserPermissions(user, newProfile)
        }
        
        return null
      }

      console.log('用户 profile 信息:', profile)
      return this.buildUserPermissions(user, profile)

    } catch (error) {
      console.error('获取用户权限失败:', error)
      return null
    }
  }

  /**
   * 构建用户权限对象
   */
  private static buildUserPermissions(user: any, profile: any): UserPermissions {
    const roleId = profile.role_id || 3
    const roleName = this.getRoleName(roleId)
    const isAdmin = roleId <= 1

    return {
      userId: user.id,
      name: profile.name || user.email?.split('@')[0] || '用户',
      email: user.email || '',
      roleId,
      roleName,
      isAdmin,
      canComment: true, // 所有用户都可以评论
      canEdit: true,    // 所有用户都可以编辑自己的内容
      canDelete: isAdmin // 只有管理员可以删除
    }
  }

  /**
   * 获取角色名称
   */
  private static getRoleName(roleId: number): string {
    const roleMap: Record<number, string> = {
      0: '超级管理员',
      1: '管理员', 
      2: '经理',
      3: '开发者',
      4: '提交者'
    }
    return roleMap[roleId] || '提交者'
  }

  /**
   * 检查用户是否可以执行特定操作
   */
  static async canPerformAction(action: string, resourceId?: string): Promise<boolean> {
    try {
      const permissions = await this.getCurrentUserPermissions()
      
      if (!permissions) {
        return false
      }

      switch (action) {
        case 'comment_create':
          return permissions.canComment
        
        case 'comment_edit':
          if (!resourceId) return false
          // 检查是否是自己的评论或管理员
          return await this.canEditComment(permissions, resourceId)
        
        case 'comment_delete':
          if (!resourceId) return false
          // 检查是否是自己的评论或管理员
          return await this.canDeleteComment(permissions, resourceId)
        
        default:
          return false
      }
    } catch (error) {
      console.error('权限检查失败:', error)
      return false
    }
  }

  /**
   * 检查是否可以编辑评论
   */
  private static async canEditComment(permissions: UserPermissions, commentId: string): Promise<boolean> {
    try {
      const { data: comment, error } = await supabase
        .from('comments')
        .select('user_id')
        .eq('id', commentId)
        .single()

      if (error || !comment) {
        return false
      }

      // 管理员或评论作者可以编辑
      return permissions.isAdmin || comment.user_id === permissions.userId
    } catch (error) {
      console.error('检查编辑权限失败:', error)
      return false
    }
  }

  /**
   * 检查是否可以删除评论
   */
  private static async canDeleteComment(permissions: UserPermissions, commentId: string): Promise<boolean> {
    try {
      const { data: comment, error } = await supabase
        .from('comments')
        .select('user_id')
        .eq('id', commentId)
        .single()

      if (error || !comment) {
        return false
      }

      // 管理员或评论作者可以删除
      return permissions.isAdmin || comment.user_id === permissions.userId
    } catch (error) {
      console.error('检查删除权限失败:', error)
      return false
    }
  }

  /**
   * 检查用户是否已登录
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return !!session?.user
    } catch (error) {
      console.error('检查认证状态失败:', error)
      return false
    }
  }

  /**
   * 获取当前用户基本信息
   */
  static async getCurrentUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      return session?.user || null
    } catch (error) {
      console.error('获取当前用户失败:', error)
      return null
    }
  }
}