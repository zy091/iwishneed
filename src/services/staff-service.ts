// 服务：技术/创意人员管理（基于 tech_staff 表）
import { supabase } from '@/lib/supabaseClient'

export type StaffDepartment = '技术部' | '创意部'
export interface Staff {
  id?: string
  name: string
  department: StaffDepartment
  active?: boolean
  created_at?: string
  updated_at?: string
}

async function listStaff(params?: { department?: StaffDepartment; active?: boolean }): Promise<Staff[]> {
  let q = supabase.from('tech_staff').select('*').order('name', { ascending: true })
  if (params?.department) q = q.eq('department', params.department)
  if (typeof params?.active === 'boolean') q = q.eq('active', params.active)
  const { data, error } = await q
  if (error) throw error
  return (data || []) as Staff[]
}

async function createStaff(payload: Omit<Staff, 'id' | 'created_at' | 'updated_at'>): Promise<Staff> {
  const { data, error } = await supabase.from('tech_staff').insert({ ...payload, active: payload.active ?? true }).select().single()
  if (error) throw error
  return data as Staff
}

async function updateStaff(id: string, patch: Partial<Omit<Staff, 'id'>>): Promise<Staff> {
  const { data, error } = await supabase.from('tech_staff').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data as Staff
}

async function deleteStaff(id: string): Promise<void> {
  const { error } = await supabase.from('tech_staff').delete().eq('id', id)
  if (error) throw error
}

export const staffService = {
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
}