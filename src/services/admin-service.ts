import { supabase } from '@/lib/supabaseClient'

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`

async function authHeader() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('未登录')
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

// 兼容旧接口
export async function listAdmins() {
  const headers = await authHeader()
  const res = await fetch(FN_BASE, { method: 'GET', headers })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ admins: { user_id: string; created_at: string }[] }>
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
  const headers = await authHeader()
  const res = await fetch(FN_BASE, { method: 'POST', headers, body: JSON.stringify({ action: 'list_roles' }) })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function listUsers(params: { page?: number; pageSize?: number; search?: string; role_id?: number }): Promise<{ users: UserRow[]; total: number }> {
  const headers = await authHeader()
  const res = await fetch(FN_BASE, { method: 'POST', headers, body: JSON.stringify({ action: 'list_users', ...params }) })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
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