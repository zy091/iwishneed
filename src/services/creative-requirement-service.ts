import { supabase } from '@/lib/supabaseClient'
import { CreativeRequirement } from '@/types/requirement'

class CreativeRequirementService {
  async getCreativeRequirements(): Promise<CreativeRequirement[]> {
    const { data, error } = await supabase
      .from('creative_requirements')
      .select('*')
      .order('submit_time', { ascending: false })
    if (error) throw error
    
    const normalizedData = (data || []).map(req => {
        const newReq = { ...req };
        if (newReq.status === '未开始') newReq.status = 'not_started';
        else if (newReq.status === '处理中') newReq.status = 'in_progress';
        else if (newReq.status === '已完成') newReq.status = 'completed';
        else if (newReq.status === '不做处理') newReq.status = 'no_action';

        if (newReq.platform === '网站') newReq.platform = 'website';
        return newReq;
    });

    return normalizedData as CreativeRequirement[]
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
    if (!data) return null;

    const newReq = { ...data };
    if (newReq.status === '未开始') newReq.status = 'not_started';
    else if (newReq.status === '处理中') newReq.status = 'in_progress';
    else if (newReq.status === '已完成') newReq.status = 'completed';
    else if (newReq.status === '不做处理') newReq.status = 'no_action';

    if (newReq.platform === '网站') newReq.platform = 'website';

    return newReq as CreativeRequirement
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