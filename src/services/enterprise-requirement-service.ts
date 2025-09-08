import { supabase } from '@/lib/supabaseClient'

// =====================================================
// 企业级需求管理服务 - 统一接口
// =====================================================

export interface BaseRequirement {
  id?: string
  title: string
  description: string
  submitter_name: string
  submitter_id?: string
  submitter_avatar?: string
  status?: 'pending' | 'inProgress' | 'completed' | 'overdue'
  priority?: 'high' | 'medium' | 'low'
  due_date?: string
  tags?: string[]
  extra?: Record<string, any>
  created_at?: string
  updated_at?: string
}

export interface TechRequirement extends BaseRequirement {
  // 技术部特有字段
  month: string
  expected_completion_time: string
  urgency: '高' | '中' | '低'
  client_url?: string
  client_type: '流量运营服务' | '全案深度服务'
  tech_assignee?: string
  attachments?: any[]
  assignee_estimated_time?: string
  progress?: '未开始' | '处理中' | '已完成' | '已沟通延迟'
  start_time?: string
  end_time?: string
}

export interface CreativeRequirement extends BaseRequirement {
  // 创意部特有字段
  submit_time?: string
  expected_delivery_time?: string
  actual_delivery_time?: string
  platform?: 'GG' | 'FB' | 'CT' | '网站'
  urgency?: '高' | '中' | '低'
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

export interface RequirementStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  overdue: number
  byDepartment: {
    tech: number
    creative: number
  }
  byPriority: {
    high: number
    medium: number
    low: number
  }
}

export interface ActivityLog {
  id: string
  action: string
  actor_name: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  created_at: string
}

export interface SearchFilters {
  search?: string
  department?: '技术部' | '创意部'
  status?: 'pending' | 'inProgress' | 'completed' | 'overdue'
  priority?: 'high' | 'medium' | 'low'
  assignee?: string
  limit?: number
  offset?: number
}

class EnterpriseRequirementService {
  // =====================================================
  // 技术部需求管理
  // =====================================================

  async getTechRequirements(filters?: {
    urgency?: string
    progress?: string
    tech_assignee?: string
    submitter_name?: string
  }): Promise<TechRequirement[]> {
    let query = supabase
      .from('tech_requirements')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.urgency) {
      query = query.eq('urgency', filters.urgency)
    }
    if (filters?.progress) {
      query = query.eq('progress', filters.progress)
    }
    if (filters?.tech_assignee) {
      query = query.eq('tech_assignee', filters.tech_assignee)
    }
    if (filters?.submitter_name) {
      query = query.eq('submitter_name', filters.submitter_name)
    }

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
    // 自动设置提交者信息
    const payload = await this.enrichSubmitterInfo(requirement)
    
    const { data, error } = await supabase
      .from('tech_requirements')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateTechRequirement(id: string, updates: Partial<TechRequirement>): Promise<TechRequirement> {
    // 如果进度从"未开始"变为"处理中"，自动设置开始时间
    if (updates.progress === '处理中' && !updates.start_time) {
      updates.start_time = new Date().toISOString()
    }
    
    // 如果进度变为"已完成"，自动设置结束时间
    if (updates.progress === '已完成' && !updates.end_time) {
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

  async importTechRequirements(requirements: Omit<TechRequirement, 'id' | 'created_at' | 'updated_at'>[]): Promise<TechRequirement[]> {
    const payloads = await Promise.all(
      requirements.map(req => this.enrichSubmitterInfo(req))
    )

    const { data, error } = await supabase
      .from('tech_requirements')
      .insert(payloads)
      .select()

    if (error) throw error
    return data || []
  }

  // =====================================================
  // 创意部需求管理
  // =====================================================

  async getCreativeRequirements(filters?: {
    status?: string
    urgency?: string
    designer?: string
    platform?: string
  }): Promise<CreativeRequirement[]> {
    let query = supabase
      .from('creative_requirements')
      .select('*')
      .order('submit_time', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.urgency) {
      query = query.eq('urgency', filters.urgency)
    }
    if (filters?.designer) {
      query = query.eq('designer', filters.designer)
    }
    if (filters?.platform) {
      query = query.eq('platform', filters.platform)
    }

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
    const payload = await this.enrichSubmitterInfo(requirement)
    
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

  async importCreativeRequirements(requirements: Omit<CreativeRequirement, 'id' | 'created_at' | 'updated_at'>[]): Promise<CreativeRequirement[]> {
    const payloads = await Promise.all(
      requirements.map(req => this.enrichSubmitterInfo(req))
    )

    const { data, error } = await supabase
      .from('creative_requirements')
      .insert(payloads)
      .select()

    if (error) throw error
    return data || []
  }

  // =====================================================
  // 统一功能
  // =====================================================

  async getRequirementStats(): Promise<RequirementStats> {
    const { data, error } = await supabase.rpc('get_requirements_stats')
    if (error) throw error
    return data
  }

  async searchRequirements(filters: SearchFilters = {}): Promise<any[]> {
    const { data, error } = await supabase.rpc('search_requirements', {
      search_term: filters.search || null,
      department_filter: filters.department || null,
      status_filter: filters.status || null,
      priority_filter: filters.priority || null,
      assignee_filter: filters.assignee || null,
      limit_count: filters.limit || 50,
      offset_count: filters.offset || 0
    })

    if (error) throw error
    return data || []
  }

  async getRequirementActivityLogs(requirementId: string, type?: 'tech' | 'creative'): Promise<ActivityLog[]> {
    const { data, error } = await supabase.rpc('get_requirement_activity_logs', {
      req_id: requirementId,
      req_type: type || null
    })

    if (error) throw error
    return data || []
  }

  // =====================================================
  // 人员管理
  // =====================================================

  async getTechAssignees(): Promise<string[]> {
    const { data, error } = await supabase
      .from('tech_staff')
      .select('name')
      .eq('department', '技术部')
      .eq('active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return (data || []).map((r: any) => r.name)
  }

  async getDesigners(): Promise<string[]> {
    const { data, error } = await supabase
      .from('tech_staff')
      .select('name')
      .eq('department', '创意部')
      .eq('active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return (data || []).map((r: any) => r.name)
  }

  async addTechStaff(name: string, department: '技术部' | '创意部'): Promise<void> {
    const { error } = await supabase
      .from('tech_staff')
      .insert({ name, department })

    if (error) throw error
  }

  async updateTechStaff(id: string, updates: { name?: string; active?: boolean }): Promise<void> {
    const { error } = await supabase
      .from('tech_staff')
      .update(updates)
      .eq('id', id)

    if (error) throw error
  }

  // =====================================================
  // 统计分析
  // =====================================================

  async getTechAssigneeStats(): Promise<Record<string, {
    total: number
    pending: number
    inProgress: number
    completed: number
    delayed: number
    avgDuration: number
  }>> {
    const { data, error } = await supabase
      .from('tech_requirements')
      .select('tech_assignee, progress, start_time, end_time')
      .not('tech_assignee', 'is', null)

    if (error) throw error

    const stats: Record<string, any> = {}
    
    for (const req of data || []) {
      const assignee = req.tech_assignee
      if (!assignee) continue

      if (!stats[assignee]) {
        stats[assignee] = {
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          delayed: 0,
          durations: []
        }
      }

      stats[assignee].total++
      
      if (req.progress === '未开始') stats[assignee].pending++
      else if (req.progress === '处理中') stats[assignee].inProgress++
      else if (req.progress === '已完成') {
        stats[assignee].completed++
        if (req.start_time && req.end_time) {
          const duration = this.calculateDuration(req.start_time, req.end_time)
          stats[assignee].durations.push(duration)
        }
      }
      else if (req.progress === '已沟通延迟') stats[assignee].delayed++
    }

    // 计算平均耗时
    for (const assignee in stats) {
      const durations = stats[assignee].durations
      stats[assignee].avgDuration = durations.length > 0 
        ? durations.reduce((sum: number, d: number) => sum + d, 0) / durations.length
        : 0
      delete stats[assignee].durations
    }

    return stats
  }

  async checkDataIntegrity(): Promise<any> {
    const { data, error } = await supabase.rpc('check_data_integrity')
    if (error) throw error
    return data
  }

  // =====================================================
  // 私有辅助方法
  // =====================================================

  private async enrichSubmitterInfo(requirement: any): Promise<any> {
    try {
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth?.user?.id
      const name = auth?.user?.user_metadata?.full_name ||
                   auth?.user?.user_metadata?.name ||
                   (auth?.user?.email ? auth?.user?.email.split('@')[0] : '用户')
      const avatar = auth?.user?.user_metadata?.avatar_url ||
                     auth?.user?.user_metadata?.picture

      if (uid) {
        return {
          ...requirement,
          submitter_id: uid,
          submitter_name: requirement.submitter_name || name || '用户',
          submitter_avatar: requirement.submitter_avatar || avatar
        }
      }
    } catch (error) {
      console.warn('Failed to enrich submitter info:', error)
    }
    
    return requirement
  }

  private calculateDuration(startTime: string, endTime: string): number {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end.getTime() - start.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    return Math.round(diffHours * 100) / 100
  }
}

// 导出单例实例
export const enterpriseRequirementService = new EnterpriseRequirementService()

// 向后兼容的导出
export { enterpriseRequirementService as techRequirementService }
export { enterpriseRequirementService as creativeRequirementService }
export { enterpriseRequirementService as supabaseRequirementService }