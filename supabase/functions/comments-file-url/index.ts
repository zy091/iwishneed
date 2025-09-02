// 为评论附件生成临时下载地址
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const mainSupabaseUrl = Deno.env.get('MAIN_SUPABASE_URL') || ''
const mainSupabaseAnonKey = Deno.env.get('MAIN_SUPABASE_ANON_KEY') || ''
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').filter(Boolean)
const BUCKET = 'comments-attachments'
const EXPIRES = Number(Deno.env.get('COMMENTS_FILEURL_EXPIRES') || 600) // seconds

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function isAllowed(req: Request) {
  const origin = req.headers.get('origin') || ''
  // 开发环境允许localhost
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return true
  }
  return allowedOrigins.length === 0 || allowedOrigins.some((a) => origin === a || origin.endsWith(a))
}

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Main-Access-Token'
  }
}

async function verifyMainAccessToken(token: string): Promise<boolean> {
  if (!token || !mainSupabaseUrl || !mainSupabaseAnonKey) return false
  const r = await fetch(`${mainSupabaseUrl}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': mainSupabaseAnonKey }
  })
  return r.ok
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }
  if (!isAllowed(req)) {
    return new Response(JSON.stringify({ error: '不允许的来源' }), { status: 403, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } })
  }
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: '方法不允许' }), { status: 405, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } })
  }

  const token = req.headers.get('X-Main-Access-Token') || ''
  const ok = await verifyMainAccessToken(token)
  if (!ok) {
    return new Response(JSON.stringify({ error: '主项目访问令牌无效' }), { status: 401, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } })
  }

  const url = new URL(req.url)
  const path = url.searchParams.get('path') || ''
  if (!path) {
    return new Response(JSON.stringify({ error: '缺少 path 参数' }), { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } })
  }

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, EXPIRES)
  if (error || !data) {
    console.error('createSignedUrl error:', error)
    return new Response(JSON.stringify({ error: '创建签名地址失败' }), { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } })
  }

  return new Response(JSON.stringify({ success: true, url: data.signedUrl }), { status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } })
})