import { supabase } from '@/lib/supabaseClient'

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`

async function authHeader() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('未登录')
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

export async function listAdmins() {
  const headers = await authHeader()
  const res = await fetch(FN_BASE, { method: 'GET', headers })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{ admins: { user_id: string; created_at: string }[] }>
}

export async function createUser(params: { email: string; password: string; name?: string; make_admin?: boolean }) {
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