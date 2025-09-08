import { supabase } from '@/lib/supabaseClient'

// =====================================================
// 统一需求管理服务 - 企业级架构
// =====================================================

export interface TechRequirement {
  id?: string
  title: string
  description?: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  assigned_to?: string
  created_by?: string
  created_at?: string
  updated_at?: string
  due_date?: string
  estimated_hours?: number
  actual_hours?: number
  tags?: string[]
  metadata?: any

  // 技术部特有字段
  month?: string
  expected_completion_time?: string
  urgency?: 'high' | 'medium' | 'low'
  submitter_name?: string
  client_url?: string
  client_type?: 'traffic_operation' | 'full_service'
  attachments?: any[]
  assignee_estimated_time?: string
  progress?: 'not_started' | 'in_progress' | 'completed' | 'delayed'
  start_time?: string
  end_time?: string
}

export interface CreativeRequirement {
  id?: string
  title: string
  description?: string
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  created_by?: string
  created_at?: string
  updated_at?: string
  due_date?: string
  budget_range?: string
  deliverables?: string[]
  inspiration_links?: string[]
  metadata?: any

  // 创意部特有字段
  creative_type?: string
  target_audience?: string
  brand_guidelines?: string
  submit_time?: string
  expected_delivery_time?: string
  actual_delivery_time?: string
  submitter_name?: string
  platform?: 'GG' | 'FB' | 'CT' | 'website'
  urgency?: 'high' | 'medium' | 'low'
  designer?: string
  site_name?: string
  url_or_product_page?: string
  asset_type?: string
  asset_size?: string
  layout_style?: string
  asset_count?: number
  copy?: string
  style_requirements?: string
  original_assets?: string
  asset_package?: string
  remark?: string
  reference_examples?: string
}

export type UnifiedRequirement = TechRequirement | CreativeRequirement

export interface RequirementStats {
  total: number
  pending: number
  in_progress: number
  completed: number
  cancelled: number
  by_department: {
    tech: number
    creative: number
  }
  by_priority: {
    high: number
    medium: number
    low: number
  }
}

export interface ActivityLog {
  id: string
  requirement_id: string
  requirement_type: 'tech' | 'creative'
  action: string
  old_values?: any
  new_values?: any
  user_id: string
  user_name?: string
  created_at: string
}

class UnifiedRequirementService {
  // =====================================================
  // 技术需求管理
  // =====================================================

  async getTechRequirements(filters?: {
    status?: string
    priority?: string
    assigned_to?: string
    created_by?: string
    urgency?: string
    progress?: string
  }): Promise<TechRequirement[]> {
    let query = supabase
      .from('tech_requirements')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.priority) query = query.eq('priority', filters.priority)
    if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to)
    if (filters?.created_by) query = query.eq('created_by', filters.created_by)
    if (filters?.urgency) query = query.eq('urgency', filters.urgency)
    if (filters?.progress) query = query.eq('progress', filters.progress)

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  async getTechRequirement(id: string): Promise<TechRequirement | null> {
    const { data, error } = await supabase
      .from('tech_requirements')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  }

  async createTechRequirement(requirement: Omit<TechRequirement, 'id' | 'created_at' | 'updated_at'>): Promise<TechRequirement> {
    // 自动设置创建者
    const { data: user } = await supabase.auth.getUser()
    const payload = {
      ...requirement,
      created_by: user.user?.id || requirement.created_by
    }

    const { data, error } = await supabase
      .from('tech_requirements')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateTechRequirement(id: string, updates: Partial<TechRequirement>): Promise<TechRequirement> {
    // 自动处理进度变更的时间戳
    if (updates.progress === 'in_progress' && !updates.start_time) {
      updates.start_time = new Date().toISOString()
    }
    if (updates.progress === 'completed' && !updates.end_time) {
      updates.end_time = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('tech_requirements')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteTechRequirement(id: string): Promise<void> {
    const { error } = await supabase
      .from('tech_requirements')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // =====================================================
  // 创意需求管理
  // =====================================================

  async getCreativeRequirements(filters?: {
    status?: string
    priority?: string
    created_by?: string
    platform?: string
    urgency?: string
    designer?: string
  }): Promise<CreativeRequirement[]> {
    let query = supabase
      .from('creative_requirements')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.priority) query = query.eq('priority', filters.priority)
    if (filters?.created_by) query = query.eq('created_by', filters.created_by)
    if (filters?.platform) query = query.eq('platform', filters.platform)
    if (filters?.urgency) query = query.eq('urgency', filters.urgency)
    if (filters?.designer) query = query.eq('designer', filters.designer)

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  async getCreativeRequirement(id: string): Promise<CreativeRequirement | null> {
    const { data, error } = await supabase
      .from('creative_requirements')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  }

  async createCreativeRequirement(requirement: Omit<CreativeRequirement, 'id' | 'created_at' | 'updated_at'>): Promise<CreativeRequirement> {
    // 自动设置创建者
    const { data: user } = await supabase.auth.getUser()
    const payload = {
      ...requirement,
      created_by: user.user?.id || requirement.created_by
    }

    const { data, error } = await supabase
      .from('creative_requirements')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateCreativeRequirement(id: string, updates: Partial<CreativeRequirement>): Promise<CreativeRequirement> {
    const { data, error } = await supabase
      .from('creative_requirements')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteCreativeRequirement(id: string): Promise<void> {
    const { error } = await supabase
      .from('creative_requirements')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // =====================================================
  // 统一查询和统计
  // =====================================================

  async getAllRequirements(filters?: {
    status?: string
    priority?: string
    department?: 'tech' | 'creative'
    search?: string
  }): Promise<UnifiedRequirement[]> {
    const { data, error } = await supabase
      .from('all_requirements_view')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    let results = data || []

    // 应用过滤器
    if (filters?.status) {
      results = results.filter(r => r.status === filters.status)
    }
    if (filters?.priority) {
      results = results.filter(r => r.priority === filters.priority)
    }
    if (filters?.department) {
      results = results.filter(r => r.requirement_type === filters.department)
    }
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase()
      results = results.filter(r => 
        r.title?.toLowerCase().includes(searchTerm) ||
        r.description?.toLowerCase().includes(searchTerm)
      )
    }

    return results
  }

  async getRequirementStats(): Promise<RequirementStats> {
    const { data, error } = await supabase
      .from('requirement_stats_view')
      .select('*')
      .single()

    if (error) throw error

    return {
      total: data.total_requirements || 0,
      pending: data.pending_requirements || 0,
      in_progress: data.in_progress_requirements || 0,
      completed: data.completed_requirements || 0,
      cancelled: data.cancelled_requirements || 0,
      by_department: {
        tech: data.tech_requirements || 0,
        creative: data.creative_requirements || 0
      },
      by_priority: {
        high: data.high_priority || 0,
        medium: data.medium_priority || 0,
        low: data.low_priority || 0
      }
    }
  }

  async searchRequirements(query: string, options?: {
    requirement_type?: 'tech' | 'creative'
    limit?: number
  }): Promise<UnifiedRequirement[]> {
    const { data, error } = await supabase.rpc('search_requirements', {
      search_query: query,
      req_type: options?.requirement_type || null,
      result_limit: options?.limit || 50
    })

    if (error) throw error
    return data || []
  }

  // =====================================================
  // 活动日志
  // =====================================================

  async getActivityLogs(requirementId: string, requirementType?: 'tech' | 'creative'): Promise<ActivityLog[]> {
    const { data, error } = await supabase.rpc('get_requirement_activity_logs', {
      req_id: requirementId,
      req_type: requirementType || null
    })

    if (error) throw error
    return data || []
  }

  // =====================================================
  // 人员管理
  // =====================================================

  async getTechStaff(): Promise<string[]> {
    const { data, error } = await supabase
      .from('tech_staff')
      .select('name')
      .eq('department', '技术部')
      .eq('active', true)
      .order('name')

    if (error) throw error
    return (data || []).map(item => item.name)
  }

  async getCreativeStaff(): Promise<string[]> {
    const { data, error } = await supabase
      .from('tech_staff')
      .select('name')
      .eq('department', '创意部')
      .eq('active', true)
      .order('name')

    if (error) throw error
    return (data || []).map(item => item.name)
  }

  // =====================================================
  // 批量操作
  // =====================================================

  async importTechRequirements(requirements: Omit<TechRequirement, 'id' | 'created_at' | 'updated_at'>[]): Promise<TechRequirement[]> {
    const { data: user } = await supabase.auth.getUser()
    const userId = user.user?.id

    const payload = requirements.map(req => ({
      ...req,
      created_by: userId || req.created_by
    }))

    const { data, error } = await supabase
      .from('tech_requirements')
      .insert(payload)
      .select()

    if (error) throw error
    return data || []
  }

  async importCreativeRequirements(requirements: Omit<CreativeRequirement, 'id' | 'created_at' | 'updated_at'>[]): Promise<CreativeRequirement[]> {
    const { data: user } = await supabase.auth.getUser()
    const userId = user.user?.id

    const payload = requirements.map(req => ({
      ...req,
      created_by: userId || req.created_by
    }))

    const { data, error } = await supabase
      .from('creative_requirements')
      .insert(payload)
      .select()

    if (error) throw error
    return data || []
  }

  // =====================================================
  // 数据完整性检查
  // =====================================================

  async checkDataIntegrity(): Promise<any> {
    const { data, error } = await supabase.rpc('check_data_integrity')
    if (error) throw error
    return data
  }

  // =====================================================
  // 实时统计
  // =====================================================

  async getRealtimeStats(): Promise<any> {
    const { data, error } = await supabase.rpc('get_realtime_stats')
    if (error) throw error
    return data
  }

  // =====================================================
  // 工具函数
  // =====================================================

  calculateDuration(startTime?: string, endTime?: string): number {
    if (!startTime || !endTime) return 0
    
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end.getTime() - start.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    
    return Math.round(diffHours * 100) / 100
  }

  formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'pending': '待处理',
      'in_progress': '进行中',
      'completed': '已完成',
      'cancelled': '已取消',
      'not_started': '未开始',
      'delayed': '已延迟'
    }
    return statusMap[status] || status
  }

  formatPriority(priority: string): string {
    const priorityMap: Record<string, string> = {
      'high': '高',
      'medium': '中',
      'low': '低'
    }
    return priorityMap[priority] || priority
  }
}

export const unifiedRequirementService = new UnifiedRequirementService()

// 向后兼容的导出
export const requirementService = unifiedRequirementService
export const techRequirementService = unifiedRequirementService
export const creativeRequirementService = unifiedRequirementService