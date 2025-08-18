import { supabase } from '@/lib/supabaseClient'

export interface SupabaseRequirement {
  id: string
  title: string
  description: string
  status: 'pending' | 'inProgress' | 'completed' | 'overdue'
  priority: 'high' | 'medium' | 'low'
  submitter: {
    id: string
    name: string
    avatar?: string
  }
  assignee: {
    id: string
    name: string
    avatar?: string
  } | null
  department: string
  type?: 'tech' | 'creative'
  due_date: string | null
  tags: string[]
  extra: any
  created_at: string
  updated_at: string
}

export class SupabaseRequirementService {
  // 获取所有需求
  static async getAllRequirements(): Promise<SupabaseRequirement[]> {
    const { data, error } = await supabase
      .from('requirements')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('获取需求列表失败:', error)
      throw error
    }
    
    return data || []
  }

  // 根据部门获取需求
  static async getRequirementsByDepartment(department: string): Promise<SupabaseRequirement[]> {
    const { data, error } = await supabase
      .from('requirements')
      .select('*')
      .eq('department', department)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('获取部门需求失败:', error)
      throw error
    }
    
    return data || []
  }

  // 获取单个需求
  static async getRequirementById(id: string): Promise<SupabaseRequirement | null> {
    const { data, error } = await supabase
      .from('requirements')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('获取需求详情失败:', error)
      return null
    }
    
    return data
  }

  // 创建需求
  static async createRequirement(requirement: Omit<SupabaseRequirement, 'id' | 'created_at' | 'updated_at'>): Promise<SupabaseRequirement> {
    const { data, error } = await supabase
      .from('requirements')
      .insert([requirement])
      .select()
      .single()
    
    if (error) {
      console.error('创建需求失败:', error)
      throw error
    }
    
    return data
  }

  // 更新需求
  static async updateRequirement(id: string, updates: Partial<SupabaseRequirement>): Promise<SupabaseRequirement> {
    const { data, error } = await supabase
      .from('requirements')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('更新需求失败:', error)
      throw error
    }
    
    return data
  }

  // 删除需求
  static async deleteRequirement(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('requirements')
      .delete()
      .eq('id', id)
    
    if (error) {
      console.error('删除需求失败:', error)
      return false
    }
    
    return true
  }

  // 获取需求统计
  static async getRequirementStats(department?: string): Promise<{
    total: number
    completed: number
    inProgress: number
    pending: number
    overdue: number
  }> {
    let query = supabase.from('requirements').select('status')
    
    if (department) {
      query = query.eq('department', department)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('获取统计数据失败:', error)
      throw error
    }
    
    const stats = {
      total: data?.length || 0,
      completed: data?.filter(r => r.status === 'completed').length || 0,
      inProgress: data?.filter(r => r.status === 'inProgress').length || 0,
      pending: data?.filter(r => r.status === 'pending').length || 0,
      overdue: data?.filter(r => r.status === 'overdue').length || 0
    }
    
    return stats
  }

  // 搜索需求
  static async searchRequirements(searchTerm: string, department?: string): Promise<SupabaseRequirement[]> {
    let query = supabase
      .from('requirements')
      .select('*')
      .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
    
    if (department) {
      query = query.eq('department', department)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('搜索需求失败:', error)
      throw error
    }
    
    return data || []
  }
}

// 部门配置
export const DEPARTMENT_CONFIG = {
  tech: {
    name: '技术部',
    fields: [
      'title',
      'description', 
      'priority',
      'assignee',
      'due_date',
      'tech_stack',
      'complexity',
      'estimated_hours',
      'repository_url',
      'tags'
    ],
    requiredFields: ['title', 'description', 'priority', 'tech_stack']
  },
  creative: {
    name: '创意部',
    fields: [
      'title',
      'description',
      'priority', 
      'assignee',
      'due_date',
      'creative_type',
      'target_audience',
      'brand_guidelines',
      'deliverables',
      'tags'
    ],
    requiredFields: ['title', 'description', 'priority', 'creative_type']
  },
  general: {
    name: '通用',
    fields: [
      'title',
      'description',
      'priority',
      'assignee', 
      'due_date',
      'tags'
    ],
    requiredFields: ['title', 'description', 'priority']
  }
}

// 获取部门配置
export function getDepartmentConfig(department: string) {
  switch (department) {
    case '技术部':
      return DEPARTMENT_CONFIG.tech
    case '创意部':
      return DEPARTMENT_CONFIG.creative
    default:
      return DEPARTMENT_CONFIG.general
  }
}