import { supabase } from '@/lib/supabaseClient'
import { CreativeRequirement } from '@/types/requirement'

class CreativeRequirementService {
  async getCreativeRequirements(): Promise<CreativeRequirement[]> {
    const { data, error } = await supabase
      .from('creative_requirements')
      .select('*')
      .order('submit_time', { ascending: false })
    if (error) throw error
    
    return (data || []) as CreativeRequirement[]
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
    if (!data) return null

    return data as CreativeRequirement
  }

  async createCreativeRequirement(payload: Omit<CreativeRequirement, 'id' | 'created_at' | 'updated_at'>): Promise<CreativeRequirement> {
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

  // 设计师下拉：从 tech_staff 读取（创意部 & active=true）
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

  // 获取创意需求统计
  async getCreativeRequirementStats() {
    const { data, error } = await supabase
      .from('creative_requirements')
      .select('status, urgency, asset_type')
    
    if (error) throw error

    const requirements = data || []
    
    return {
      total: requirements.length,
      notStarted: requirements.filter(r => r.status === '未开始').length,
      inProgress: requirements.filter(r => r.status === '处理中').length,
      completed: requirements.filter(r => r.status === '已完成').length,
      noAction: requirements.filter(r => r.status === '不做处理').length,
      byUrgency: {
        high: requirements.filter(r => r.urgency === '高').length,
        medium: requirements.filter(r => r.urgency === '中').length,
        low: requirements.filter(r => r.urgency === '低').length
      },
      byAssetType: requirements.reduce((acc: Record<string, number>, req) => {
        const type = req.asset_type || '未分类'
        acc[type] = (acc[type] || 0) + 1
        return acc
      }, {})
    }
  }
}

export const creativeRequirementService = new CreativeRequirementService()