/* Deno Edge Function: admin-users
Endpoints:
  - POST /create_user { email, password, name, make_admin?: boolean }
  - POST /set_admin { user_id, is_admin: boolean }
  - GET  /admins
Auth:
  - Caller must be logged-in and in public.app_admins
*/
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function cors(req: Request) {
  const origin = req.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  }
}

async function getCaller(url: string, anon: string, bearer: string) {
  const userClient = createClient(url, anon, { global: { headers: { Authorization: bearer } } })
  const { data, error } = await userClient.auth.getUser()
  if (error || !data?.user) throw new Error('unauthorized')
  return data.user
}

async function ensureAdmin(url: string, serviceRole: string, user_id: string) {
  const admin = createClient(url, serviceRole, { auth: { persistSession: false } })
  const { data, error } = await admin.from('app_admins').select('user_id').eq('user_id', user_id).maybeSingle()
  if (error || !data) throw new Error('forbidden')
}

serve(async (req) => {
  const headers = cors(req)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })

  const url = Deno.env.get('SUPABASE_URL')!
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authz = req.headers.get('authorization') || ''
  if (!authz.toLowerCase().startsWith('bearer ')) {
    return new Response(JSON.stringify({ error: 'missing bearer token' }), { status: 401, headers })
  }

  try {
    const caller = await getCaller(url, anon, authz)
    await ensureAdmin(url, serviceRole, caller.id)

    const admin = createClient(url, serviceRole, { auth: { persistSession: false } })
    const u = new URL(req.url)
    const path = u.pathname.split('/').pop() || ''

    if (req.method === 'GET' && path === 'admin-users') {
      // GET /admin-users => list admins
      const { data, error } = await admin.from('app_admins').select('user_id, created_at').order('created_at', { ascending: false })
      if (error) throw error
      return new Response(JSON.stringify({ admins: data }), { status: 200, headers })
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      if (path === 'admin-users') {
        const action = (body.action || '').toString()

        if (action === 'create_user') {
          const { email, password, name, make_admin } = body
          if (!email || !password) return new Response(JSON.stringify({ error: 'email/password required' }), { status: 400, headers })
          const { data, error } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: name || email.split('@')[0] },
          })
          if (error || !data?.user) throw error || new Error('create failed')

          if (make_admin) {
            const { error: e2 } = await admin.from('app_admins').insert({ user_id: data.user.id }).single()
            if (e2) throw e2
          }
          return new Response(JSON.stringify({ user_id: data.user.id }), { status: 200, headers })
        }

        if (action === 'set_admin') {
          const { user_id, is_admin } = body
          if (!user_id) return new Response(JSON.stringify({ error: 'user_id required' }), { status: 400, headers })
          if (is_admin) {
            const { error: e1 } = await admin.from('app_admins').insert({ user_id }).select().single()
            if (e1 && !`${e1.message}`.includes('duplicate')) throw e1
          } else {
            const { error: e2 } = await admin.from('app_admins').delete().eq('user_id', user_id)
            if (e2) throw e2
          }
          return new Response(JSON.stringify({ ok: true }), { status: 200, headers })
        }
      }
    }

    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers })
  } catch (e) {
    const status = /unauthorized/.test(String(e)) ? 401 : /forbidden/.test(String(e)) ? 403 : 500
    return new Response(JSON.stringify({ error: String(e) }), { status, headers })
  }
})