import { supabase } from '@/lib/supabaseClient'

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`

// 调试：打印URL以确认配置
console.log('Admin service URL:', FN_BASE)

async function authHeader() {
  console.log('🔑 获取认证头...')
  const { data, error } = await supabase.auth.getSession()
  console.log('🔑 会话状态:', { 
    hasSession: !!data.session, 
    hasToken: !!data.session?.access_token,
    error: error?.message 
  })
  
  const token = data.session?.access_token
  if (!token) {
    console.error('🔑 无有效令牌，用户未登录')
    throw new Error('用户未登录或会话已过期，请重新登录')
  }
  
  return { 
    Authorization: `Bearer ${token}`, 
    'Content-Type': 'application/json',
    'X-Client-Info': 'requirement-management-system'
  }
}

// 兼容旧接口
export async function listAdmins() {
  try {
    console.log('📋 获取管理员列表...')
    const headers = await authHeader()
    console.log('📋 请求URL:', FN_BASE)
    
    const res = await fetch(FN_BASE, { method: 'GET', headers })
    console.log('📋 响应状态:', { status: res.status, ok: res.ok, statusText: res.statusText })
    
    if (!res.ok) {
      const errorText = await res.text()
      console.error('📋 请求失败:', errorText)
      throw new Error(`请求失败 (${res.status}): ${errorText}`)
    }
    
    const result = await res.json()
    console.log('📋 获取成功:', result)
    return result as { admins: { user_id: string; created_at: string }[] }
  } catch (error: any) {
    console.error('📋 listAdmins 错误:', error)
    throw new Error(`获取管理员列表失败: ${error.message}`)
  }
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