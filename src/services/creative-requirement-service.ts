import { supabase } from '@/lib/supabaseClient'

export interface CreativeRequirement {
  id?: string
  submit_time?: string
  expected_delivery_time?: string
  actual_delivery_time?: string
  submitter_name: string
  platform: 'GG' | 'FB' | 'CT' | '网站'
  status: '未开始' | '处理中' | '已完成' | '不做处理'
  urgency: '高' | '中' | '低'
  designer?: string
  site_name?: string
  url_or_product_page?: string
  asset_type?: 'Google广告图' | 'Meta广告图' | '网站Banner图' | '网站产品图' | '网站横幅图' | '联盟营销' | 'EDM营销' | 'Criteo广告图'
  asset_size?: string
  layout_style?: string
  asset_count?: number
  copy?: string
  style_requirements?: string
  original_assets?: string
  asset_package?: string
  remark?: string
  reference_examples?: string
  created_at?: string
  updated_at?: string
}

class CreativeRequirementService {
  async getCreativeRequirements(): Promise<CreativeRequirement[]> {
    const { data, error } = await supabase
      .from('creative_requirements')
      .select('*')
      .order('submit_time', { ascending: false })
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
      if ((error as any).code === 'PGRST116') return null
      throw error
    }
    return data
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
}

export const creativeRequirementService = new CreativeRequirementService()