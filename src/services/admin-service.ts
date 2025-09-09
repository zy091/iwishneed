import { supabase } from '@/lib/supabaseClient'

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`

async function authHeader() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('未登录')
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export async function listAdmins() {
  // Using fallback logic directly to avoid edge function issues
  const { data, error } = await supabase
    .from('profiles')
    .select('id: user_id, created_at')
    .in('role_id', [0, 1]);
  if (error) {
    console.error('Error fetching admins from profiles:', error);
    throw error;
  }
  return { admins: (data || []).map((x: any) => ({ user_id: x.id, created_at: x.created_at })) };
}

// 扩展：支持 role_id（后端未上线时忽略）
export async function createUser(params: { email: string; password: string; name?: string; role_id?: number; make_admin?: boolean }) {
  const headers = await authHeader()
  const res = await fetch(FN_BASE, { method: 'POST', headers, body: JSON.stringify({ action: 'create_user', ...params }) })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ user_id: string }>
}

export async function setAdmin(user_id: string, is_admin: boolean) {
  const headers = await authHeader()
  const res = await fetch(FN_BASE, { method: 'POST', headers, body: JSON.stringify({ action: 'set_admin', user_id, is_admin }) })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ ok: true }>
}

// 新增：统一的用户/角色管理接口（需要后端配合）
export type Role = { id: number; name: string }
export type UserRow = { id: string; email: string; name?: string; role_id: number; last_sign_in_at?: string; created_at?: string; active?: boolean }

export async function listRoles(): Promise<{ roles: Role[] }> {
  try {
    const headers = await authHeader()
    const res = await fetch(FN_BASE, { method: 'POST', headers, body: JSON.stringify({ action: 'list_roles' }) })
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  } catch {
    const fallback: Role[] = [
      { id: 0, name: '超级管理员' },
      { id: 1, name: '管理员' },
      { id: 2, name: '经理' },
      { id: 3, name: '开发者' },
      { id: 4, name: '提交者' },
    ]
    return { roles: fallback }
  }
}

export async function listUsers(params: { page?: number; pageSize?: number; search?: string; role_id?: number }): Promise<{ users: UserRow[]; total: number }> {
  // Using fallback logic directly to avoid edge function issues
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  let query = supabase.from('profiles').select('id, name, role_id, created_at', { count: 'exact' });
  if (params.search) {
    query = query.or(`name.ilike.%${params.search}%`);
  }
  if (typeof params.role_id === 'number') {
    query = query.eq('role_id', params.role_id);
  }
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to).order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching users from profiles:', error);
    throw error;
  }
  return {
    users: (data || []).map((u: any) => ({
      id: u.id,
      email: '', // profiles does not have email, leave it blank
      name: u.name,
      role_id: u.role_id,
      last_sign_in_at: undefined, // profiles does not have last_sign_in_at
      created_at: u.created_at,
      active: true // profiles does not have active, default to true
    })),
    total: count || 0
  };
}

export async function setUserRole(user_id: string, role_id: number): Promise<{ ok: true }> {
  const headers = await authHeader()
  const res = await fetch(FN_BASE, { method: 'POST', headers, body: JSON.stringify({ action: 'set_user_role', user_id, role_id }) })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function resetPassword(user_id: string): Promise<{ ok: true }> {
  const headers = await authHeader()
  const res = await fetch(FN_BASE, { method: 'POST', headers, body: JSON.stringify({ action: 'reset_password', user_id }) })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function toggleActive(user_id: string, active: boolean): Promise<{ ok: true }> {
  const headers = await authHeader()
  const res = await fetch(FN_BASE, { method: 'POST', headers, body: JSON.stringify({ action: 'toggle_active', user_id, active }) })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}