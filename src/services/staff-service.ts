import { supabase } from '@/lib/supabaseClient';

export type StaffDepartment = '技术部' | '创意部';
export interface Staff {
  id: string;
  name: string;
  department: StaffDepartment;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// A more type-safe approach to handle Supabase responses
const handleResponse = <T>(response: { data: any; error: any }): T => {
  if (response.error) {
    console.error('Database error:', response.error);
    throw response.error;
  }
  return (response.data as T) || ([] as T);
};

async function listStaff(params?: { department?: StaffDepartment; active?: boolean }): Promise<Staff[]> {
  let query = supabase.from('tech_staff').select('*').order('name', { ascending: true });

  if (params?.department) {
    query = query.eq('department', params.department);
  }
  if (typeof params?.active === 'boolean') {
    query = query.eq('active', params.active);
  }

  const response = await query;
  return handleResponse<Staff[]>(response);
}

async function createStaff(payload: Omit<Staff, 'id' | 'created_at' | 'updated_at'>): Promise<Staff> {
  const response = await supabase
    .from('tech_staff')
    .insert({ ...payload, active: payload.active ?? true })
    .select()
    .single();
  
  // Ensure we return a single object, not an array
  const data = handleResponse<Staff>(response);
  if (Array.isArray(data)) {
    throw new Error('Expected a single staff member, but got an array.');
  }
  return data;
}

async function updateStaff(id: string, patch: Partial<Omit<Staff, 'id'>>): Promise<Staff> {
  const response = await supabase
    .from('tech_staff')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  const data = handleResponse<Staff>(response);
  if (Array.isArray(data)) {
    throw new Error('Expected a single staff member, but got an array.');
  }
  return data;
}

async function deleteStaff(id: string): Promise<void> {
  const { error } = await supabase.from('tech_staff').delete().eq('id', id);
  if (error) {
    console.error('Error deleting staff:', error);
    throw error;
  }
}

export const staffService = {
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
};