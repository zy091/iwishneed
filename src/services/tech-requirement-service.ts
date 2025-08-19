import { supabase } from '@/lib/supabaseClient'

export interface TechRequirement {
  id?: string
  title: string
  
  // 提交人填写字段（严格按照飞书表格）
  month: string // 月份
  submit_time?: string // 需求提交时间
  expected_completion_time: string // 期望完成的时间
  urgency: '高' | '中' | '低' // 紧急程度
  submitter_name: string // 提交人（直接使用用户名）
  client_url?: string // 需支持的客户网址
  description: string // 具体需求描述
  tech_assignee?: string // 技术负责人
  client_type: '流量运营服务' | '全案深度服务' // 客户类型
  attachments?: any[] // 支持上传附件
  
  // 技术负责人填写字段
  assignee_estimated_time?: string // 技术负责人预计可完成时间
  progress?: '未开始' | '处理中' | '已完成' | '已沟通延迟' // 技术完成进度
  start_time?: string // 开始时间
  end_time?: string // 结束时间
  
  // 系统字段
  submitter_id?: string
  submitter_avatar?: string
  created_at?: string
  updated_at?: string
}

export interface TechRequirementStats {
  total: number
  pending: number // 未开始
  inProgress: number // 处理中
  completed: number // 已完成
  delayed: number // 已沟通延迟
  byUrgency: {
    high: number // 高
    medium: number // 中
    low: number // 低
  }
  byClientType: {
    traffic: number // 流量运营服务
    fullService: number // 全案深度服务
  }
}

class TechRequirementService {
  // 获取技术需求列表
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

  // 获取技术需求详情
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

  // 创建技术需求
  async createTechRequirement(requirement: Omit<TechRequirement, 'id' | 'created_at' | 'updated_at'>): Promise<TechRequirement> {
    const { data, error } = await supabase
      .from('tech_requirements')
      .insert(requirement)
      .select()
      .single()

    if (error) throw error
    return data
  }

  // 更新技术需求
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

  // 删除技术需求
  async deleteTechRequirement(id: string): Promise<void> {
    const { error } = await supabase
      .from('tech_requirements')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // 批量导入技术需求
  async importTechRequirements(requirements: Omit<TechRequirement, 'id' | 'created_at' | 'updated_at'>[]): Promise<TechRequirement[]> {
    const { data, error } = await supabase
      .from('tech_requirements')
      .insert(requirements)
      .select()

    if (error) throw error
    return data || []
  }

  // 获取技术需求统计
  async getTechRequirementStats(): Promise<TechRequirementStats> {
    const { data, error } = await supabase
      .from('tech_requirements')
      .select('urgency, progress, client_type')

    if (error) throw error

    const requirements = data || []
    
    return {
      total: requirements.length,
      pending: requirements.filter(r => r.progress === '未开始').length,
      inProgress: requirements.filter(r => r.progress === '处理中').length,
      completed: requirements.filter(r => r.progress === '已完成').length,
      delayed: requirements.filter(r => r.progress === '已沟通延迟').length,
      byUrgency: {
        high: requirements.filter(r => r.urgency === '高').length,
        medium: requirements.filter(r => r.urgency === '中').length,
        low: requirements.filter(r => r.urgency === '低').length,
      },
      byClientType: {
        traffic: requirements.filter(r => r.client_type === '流量运营服务').length,
        fullService: requirements.filter(r => r.client_type === '全案深度服务').length,
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

  // 获取技术负责人统计
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
          const duration = this.calculateTechDuration(req.start_time, req.end_time)
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

  // 获取所有技术负责人列表（集中维护：tech_staff）
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
}

export const techRequirementService = new TechRequirementService()