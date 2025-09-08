import { supabase } from '@/lib/supabaseClient'
import type { 
  AppAdmin, 
  Role, 
  Profile, 
  AdminAuditLog, 
  TechStaff,
  DataIntegrityResult,
  RequirementStats,
  AssigneeStats
} from '@/types/requirement'

// =====================================================
// 企业级管理服务 - 管理员功能
// =====================================================

class EnterpriseAdminService {
  // =====================================================
  // 权限管理
  // =====================================================

  async getCurrentAdmin(): Promise<AppAdmin | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('app_admins')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  async isAdmin(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_admin')
      return !error && data === true
    } catch {
      return false
    }
  }

  async isSuperAdmin(): Promise<boolean> {
    const admin = await this.getCurrentAdmin()
    return admin?.role === 'super_admin'
  }

  async hasPermission(permission: string): Promise<boolean> {
    const admin = await this.getCurrentAdmin()
    if (!admin) return false
    
    return admin.permissions.includes(permission) || admin.permissions.includes('*')
  }

  // =====================================================
  // 管理员管理
  // =====================================================

  async getAdmins(): Promise<AppAdmin[]> {
    const { data, error } = await supabase
      .from('app_admins')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async addAdmin(adminData: {
    user_id: string
    email: string
    full_name?: string
    role: 'super_admin' | 'admin' | 'manager'
    permissions: string[]
  }): Promise<AppAdmin> {
    const { data, error } = await supabase
      .from('app_admins')
      .insert(adminData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateAdmin(adminId: string, updates: Partial<AppAdmin>): Promise<AppAdmin> {
    const { data, error } = await supabase
      .from('app_admins')
      .update(updates)
      .eq('id', adminId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deactivateAdmin(adminId: string): Promise<void> {
    const { error } = await supabase
      .from('app_admins')
      .update({ active: false })
      .eq('id', adminId)

    if (error) throw error
  }

  // =====================================================
  // 角色管理
  // =====================================================

  async getRoles(): Promise<Role[]> {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  }

  async createRole(roleData: {
    name: string
    description?: string
    permissions: string[]
  }): Promise<Role> {
    const { data, error } = await supabase
      .from('roles')
      .insert(roleData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateRole(roleId: string, updates: Partial<Role>): Promise<Role> {
    const { data, error } = await supabase
      .from('roles')
      .update(updates)
      .eq('id', roleId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteRole(roleId: string): Promise<void> {
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', roleId)

    if (error) throw error
  }

  // =====================================================
  // 用户档案管理
  // =====================================================

  async getProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }

    return data
  }

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        ...updates
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // =====================================================
  // 人员管理
  // =====================================================

  async getTechStaff(): Promise<TechStaff[]> {
    const { data, error } = await supabase
      .from('tech_staff')
      .select('*')
      .order('department', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  }

  async addTechStaff(staffData: {
    name: string
    department: '技术部' | '创意部'
  }): Promise<TechStaff> {
    const { data, error } = await supabase
      .from('tech_staff')
      .insert(staffData)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateTechStaff(staffId: string, updates: Partial<TechStaff>): Promise<TechStaff> {
    const { data, error } = await supabase
      .from('tech_staff')
      .update(updates)
      .eq('id', staffId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deactivateTechStaff(staffId: string): Promise<void> {
    const { error } = await supabase
      .from('tech_staff')
      .update({ active: false })
      .eq('id', staffId)

    if (error) throw error
  }

  // =====================================================
  // 审计日志
  // =====================================================

  async getAuditLogs(filters?: {
    admin_id?: string
    action?: string
    target_type?: string
    limit?: number
    offset?: number
  }): Promise<AdminAuditLog[]> {
    let query = supabase
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.admin_id) {
      query = query.eq('admin_id', filters.admin_id)
    }
    if (filters?.action) {
      query = query.eq('action', filters.action)
    }
    if (filters?.target_type) {
      query = query.eq('target_type', filters.target_type)
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  async logAdminAction(actionData: {
    action: string
    target_type?: string
    target_id?: string
    old_values?: Record<string, any>
    new_values?: Record<string, any>
  }): Promise<void> {
    const admin = await this.getCurrentAdmin()
    if (!admin) return

    const { error } = await supabase
      .from('admin_audit_logs')
      .insert({
        admin_id: admin.id,
        admin_name: admin.full_name || admin.email,
        ...actionData
      })

    if (error) {
      console.error('记录审计日志失败:', error)
    }
  }

  // =====================================================
  // 系统统计
  // =====================================================

  async getSystemStats(): Promise<{
    requirements: RequirementStats
    users: {
      total: number
      admins: number
      active: number
    }
    comments: {
      total: number
      today: number
      thisWeek: number
    }
    storage: {
      used: number
      limit: number
      percentage: number
    }
  }> {
    // 获取需求统计
    const { data: reqStats, error: reqError } = await supabase.rpc('get_requirements_stats')
    if (reqError) throw reqError

    // 获取用户统计
    const { data: userCount, error: userError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
    if (userError) throw userError

    const { data: adminCount, error: adminError } = await supabase
      .from('app_admins')
      .select('id', { count: 'exact', head: true })
      .eq('active', true)
    if (adminError) throw adminError

    // 获取评论统计
    const { data: commentCount, error: commentError } = await supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
    if (commentError) throw commentError

    const today = new Date().toISOString().split('T')[0]
    const { data: todayComments, error: todayError } = await supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', today)
    if (todayError) throw todayError

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: weekComments, error: weekError } = await supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgo)
    if (weekError) throw weekError

    return {
      requirements: reqStats,
      users: {
        total: userCount?.count || 0,
        admins: adminCount?.count || 0,
        active: userCount?.count || 0
      },
      comments: {
        total: commentCount?.count || 0,
        today: todayComments?.count || 0,
        thisWeek: weekComments?.count || 0
      },
      storage: {
        used: 0, // 需要从存储服务获取
        limit: 1024 * 1024 * 1024, // 1GB 默认限制
        percentage: 0
      }
    }
  }

  async getAssigneeStats(): Promise<Record<string, AssigneeStats>> {
    const { data: techReqs, error: techError } = await supabase
      .from('tech_requirements')
      .select('tech_assignee, progress, start_time, end_time, created_at')
      .not('tech_assignee', 'is', null)

    if (techError) throw techError

    const stats: Record<string, AssigneeStats> = {}
    
    for (const req of techReqs || []) {
      const assignee = req.tech_assignee
      if (!assignee) continue

      if (!stats[assignee]) {
        stats[assignee] = {
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          delayed: 0,
          avgDuration: 0
        }
      }

      stats[assignee].total++
      
      switch (req.progress) {
        case '未开始':
          stats[assignee].pending++
          break
        case '处理中':
          stats[assignee].inProgress++
          break
        case '已完成':
          stats[assignee].completed++
          break
        case '已沟通延迟':
          stats[assignee].delayed++
          break
      }
    }

    return stats
  }

  // =====================================================
  // 数据完整性检查
  // =====================================================

  async checkDataIntegrity(): Promise<DataIntegrityResult> {
    const { data, error } = await supabase.rpc('check_data_integrity')
    if (error) throw error
    return data
  }

  async repairDataIntegrity(): Promise<{
    repaired: number
    errors: string[]
  }> {
    // 这里可以实现数据修复逻辑
    // 例如：删除孤立的评论、修复无效状态等
    const result = {
      repaired: 0,
      errors: [] as string[]
    }

    try {
      // 删除孤立的评论附件
      const { error: attachError } = await supabase
        .from('comment_attachments')
        .delete()
        .not('comment_id', 'in', 
          supabase.from('comments').select('id')
        )

      if (attachError) {
        result.errors.push(`删除孤立附件失败: ${attachError.message}`)
      } else {
        result.repaired++
      }

      // 可以添加更多修复逻辑...

    } catch (error: any) {
      result.errors.push(`数据修复过程中出错: ${error.message}`)
    }

    return result
  }

  // =====================================================
  // 系统配置
  // =====================================================

  async getSystemConfig(): Promise<Record<string, any>> {
    // 这里可以从配置表或环境变量获取系统配置
    return {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedFileTypes: ['image/*', 'application/pdf', 'text/*'],
      maxCommentsPerRequirement: 100,
      autoAssignEnabled: false,
      notificationEnabled: true,
      backupEnabled: true,
      maintenanceMode: false
    }
  }

  async updateSystemConfig(config: Record<string, any>): Promise<void> {
    // 这里可以更新系统配置
    await this.logAdminAction({
      action: 'update_system_config',
      target_type: 'system',
      new_values: config
    })
  }

  // =====================================================
  // 数据导出
  // =====================================================

  async exportData(options: {
    includeTechRequirements?: boolean
    includeCreativeRequirements?: boolean
    includeComments?: boolean
    includeUsers?: boolean
    dateRange?: {
      start: string
      end: string
    }
  }): Promise<{
    data: any
    filename: string
  }> {
    const exportData: any = {
      exported_at: new Date().toISOString(),
      version: '1.0.0'
    }

    if (options.includeTechRequirements) {
      let query = supabase.from('tech_requirements').select('*')
      if (options.dateRange) {
        query = query
          .gte('created_at', options.dateRange.start)
          .lte('created_at', options.dateRange.end)
      }
      const { data, error } = await query
      if (error) throw error
      exportData.tech_requirements = data
    }

    if (options.includeCreativeRequirements) {
      let query = supabase.from('creative_requirements').select('*')
      if (options.dateRange) {
        query = query
          .gte('created_at', options.dateRange.start)
          .lte('created_at', options.dateRange.end)
      }
      const { data, error } = await query
      if (error) throw error
      exportData.creative_requirements = data
    }

    if (options.includeComments) {
      let query = supabase.from('comments').select('*')
      if (options.dateRange) {
        query = query
          .gte('created_at', options.dateRange.start)
          .lte('created_at', options.dateRange.end)
      }
      const { data, error } = await query
      if (error) throw error
      exportData.comments = data
    }

    if (options.includeUsers) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, department, position, created_at')
      if (error) throw error
      exportData.users = data
    }

    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `requirement_system_export_${timestamp}.json`

    await this.logAdminAction({
      action: 'export_data',
      target_type: 'system',
      new_values: { options, recordCount: Object.keys(exportData).length - 2 }
    })

    return {
      data: exportData,
      filename
    }
  }
}

// 导出单例实例
export const enterpriseAdminService = new EnterpriseAdminService()

// 向后兼容的导出
export { enterpriseAdminService as adminService }
export default enterpriseAdminService