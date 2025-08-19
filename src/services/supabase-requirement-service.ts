import { supabase } from '@/lib/supabaseClient'

export interface TechRequirement {
  id?: string
  title: string
  description?: string
  department: '技术部'
  type: 'tech'
  
  // 提交人信息
  submitter?: {
    id: string
    name: string
    avatar?: string
  }
  submit_time?: string
  
  // 技术部 - 提交人填写字段
  tech_month?: string
  tech_expected_completion_time?: string
  tech_urgency?: '高' | '中' | '低'
  tech_client_url?: string
  tech_client_type?: '流量运营服务' | '全案深度服务'
  tech_attachments?: any[]
  
  // 技术部 - 技术负责人填写字段
  tech_assignee?: string
  tech_estimated_completion_time?: string
  tech_progress?: '未开始' | '处理中' | '已完成' | '已沟通延迟'
  tech_start_time?: string
  tech_end_time?: string
  
  // 通用字段
  status?: 'pending' | 'inProgress' | 'completed' | 'overdue'
  priority?: 'high' | 'medium' | 'low'
  due_date?: string
  tags?: string[]
  extra?: any
  created_at?: string
  updated_at?: string
}

export interface CreativeRequirement {
  id?: string
  title: string
  description?: string
  department: '创意部'
  type: 'creative'
  submitter?: {
    id: string
    name: string
    avatar?: string
  }
  creative_type?: string
  creative_target_audience?: string
  creative_brand_guidelines?: string
  creative_deliverables?: string
  status?: 'pending' | 'inProgress' | 'completed' | 'overdue'
  priority?: 'high' | 'medium' | 'low'
  due_date?: string
  tags?: string[]
  extra?: any
  created_at?: string
  updated_at?: string
}

export type Requirement = TechRequirement | CreativeRequirement

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

export interface TechAssignee {
  id: number
  name: string
  is_active: boolean
  created_at: string
}

class SupabaseRequirementService {
  // 获取技术负责人列表
  async getTechAssignees(): Promise<TechAssignee[]> {
    const { data, error } = await supabase
      .from('tech_assignees')
      .select('*')
      .eq('is_active', true)
      .order('name')
    
    if (error) throw error
    return data || []
  }

  // 添加技术负责人
  async addTechAssignee(name: string): Promise<TechAssignee> {
    const { data, error } = await supabase
      .from('tech_assignees')
      .insert({ name })
      .select()
      .single()
    
    if (error) throw error
    return data
  }

  // 获取需求列表
  async getRequirements(filters?: {
    department?: string
    status?: string
    assignee?: string
    submitter?: string
  }): Promise<Requirement[]> {
    let query = supabase
      .from('requirements')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.department) {
      query = query.eq('department', filters.department)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.assignee) {
      query = query.eq('tech_assignee', filters.assignee)
    }
    if (filters?.submitter) {
      query = query.eq('submitter->name', filters.submitter)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  // 获取需求详情
  async getRequirement(id: string): Promise<Requirement | null> {
    const { data, error } = await supabase
      .from('requirements')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  }

  // 创建需求
  async createRequirement(requirement: Partial<Requirement>): Promise<Requirement> {
    const { data, error } = await supabase
      .from('requirements')
      .insert(requirement)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // 更新需求
  async updateRequirement(id: string, updates: Partial<Requirement>): Promise<Requirement> {
    const { data, error } = await supabase
      .from('requirements')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // 更新技术负责人字段（仅技术负责人可操作）
  async updateTechAssigneeFields(id: string, updates: {
    tech_assignee?: string
    tech_estimated_completion_time?: string
    tech_progress?: '未开始' | '处理中' | '已完成' | '已沟通延迟'
    tech_start_time?: string
    tech_end_time?: string
  }): Promise<Requirement> {
    // 如果进度从"未开始"变为"处理中"，自动设置开始时间
    if (updates.tech_progress === '处理中' && !updates.tech_start_time) {
      updates.tech_start_time = new Date().toISOString()
    }
    
    // 如果进度变为"已完成"，自动设置结束时间
    if (updates.tech_progress === '已完成' && !updates.tech_end_time) {
      updates.tech_end_time = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('requirements')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // 删除需求
  async deleteRequirement(id: string): Promise<void> {
    const { error } = await supabase
      .from('requirements')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // 批量导入需求
  async importRequirements(requirements: Partial<Requirement>[]): Promise<Requirement[]> {
    const { data, error } = await supabase
      .from('requirements')
      .insert(requirements)
      .select()

    if (error) throw error
    return data || []
  }

  // 获取统计数据
  async getStats(): Promise<RequirementStats> {
    const { data, error } = await supabase
      .from('requirements')
      .select('status, department, priority')

    if (error) throw error

    const requirements = data || []
    
    return {
      total: requirements.length,
      pending: requirements.filter(r => r.status === 'pending').length,
      inProgress: requirements.filter(r => r.status === 'inProgress').length,
      completed: requirements.filter(r => r.status === 'completed').length,
      overdue: requirements.filter(r => r.status === 'overdue').length,
      byDepartment: {
        tech: requirements.filter(r => r.department === '技术部').length,
        creative: requirements.filter(r => r.department === '创意部').length,
      },
      byPriority: {
        high: requirements.filter(r => r.priority === 'high').length,
        medium: requirements.filter(r => r.priority === 'medium').length,
        low: requirements.filter(r => r.priority === 'low').length,
      }
    }
  }

  // 计算技术耗时（小时）
  calculateTechDuration(startTime?: string, endTime?: string): number {
    if (!startTime || !endTime) return 0
    
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end.getTime() - start.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    
    return Math.round(diffHours * 100) / 100 // 保留两位小数
  }

  // 获取技术部需求统计（按负责人）
  async getTechStatsByAssignee(): Promise<Record<string, {
    total: number
    pending: number
    inProgress: number
    completed: number
    avgDuration: number
  }>> {
    const { data, error } = await supabase
      .from('requirements')
      .select('tech_assignee, tech_progress, tech_start_time, tech_end_time')
      .eq('department', '技术部')
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
          durations: []
        }
      }

      stats[assignee].total++
      
      if (req.tech_progress === '未开始') stats[assignee].pending++
      else if (req.tech_progress === '处理中') stats[assignee].inProgress++
      else if (req.tech_progress === '已完成') {
        stats[assignee].completed++
        if (req.tech_start_time && req.tech_end_time) {
          const duration = this.calculateTechDuration(req.tech_start_time, req.tech_end_time)
          stats[assignee].durations.push(duration)
        }
      }
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
}

export const supabaseRequirementService = new SupabaseRequirementService()