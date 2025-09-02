// 生成评论附件的签名上传令牌
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const mainSupabaseUrl = Deno.env.get('MAIN_SUPABASE_URL') || ''
const mainSupabaseAnonKey = Deno.env.get('MAIN_SUPABASE_ANON_KEY') || ''
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').filter(Boolean)
const BUCKET = 'comments-attachments'
const IMAGE_MAX_MB = 5
const FILE_MAX_MB = 10

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function isAllowed(req: Request) {
  const origin = req.headers.get('origin') || ''
  
  // 基础白名单检查
  const baseAllowed = allowedOrigins.length === 0 || 
    allowedOrigins.some((a) => origin === a || origin.endsWith(a))
  
  // 动态匹配规则 - 支持常见的部署平台和域名模式
  const dynamicRules = [
    // Netlify部署域名
    /^https:\/\/.*\.netlify\.app$/,
    // Vercel部署域名  
    /^https:\/\/.*\.vercel\.app$/,
    // 自定义域名模式（包含iwish的域名）
    /^https:\/\/.*iwish.*\.(com|cn)$/,
    // 开发环境
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/
  ]
  
  const dynamicAllowed = dynamicRules.some(rule => rule.test(origin))
  
  return baseAllowed || dynamicAllowed
}

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Main-Access-Token, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}

async function verifyMainAccessToken(token: string): Promise<{ id: string; email: string } | null> {
  if (!token || !mainSupabaseUrl || !mainSupabaseAnonKey) return null
  const r = await fetch(`${mainSupabaseUrl}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': mainSupabaseAnonKey }
  })
  if (!r.ok) return null
  const j = await r.json()
  return { id: j.id, email: j.email }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }
  if (!isAllowed(req)) {
    return new Response(JSON.stringify({ error: '不允许的来源' }), { status: 403, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: '方法不允许' }), { status: 405, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } })
  }

  const token = req.headers.get('X-Main-Access-Token') || ''
  const user = await verifyMainAccessToken(token)
  if (!user) {
    return new Response(JSON.stringify({ error: '主项目访问令牌无效' }), { status: 401, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } })
  }

  try {
    const { requirement_id, files } = await req.json()
    if (!requirement_id || !Array.isArray(files) || files.length === 0) {
      return new Response(JSON.stringify({ error: '缺少必要参数' }), { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } })
    }

    const uploads: Array<{ path: string; token: string; signedUrl: string }> = []

    for (const f of files) {
      const name = String(f.name || 'file').replace(/[\\\/]+/g, '_').replace(/\s+/g, '_')
      const type = String(f.type || '')
      const size = Number(f.size || 0)
      const isImage = type.startsWith('image/')
      const max = isImage ? IMAGE_MAX_MB : FILE_MAX_MB
      if (size > max * 1024 * 1024) {
        return new Response(JSON.stringify({ error: `${name} 超过大小限制 ${max}MB` }), { status: 400, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } })
      }

      const path = `${requirement_id}/${crypto.randomUUID()}_${name}`
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path)
      if (error || !data) {
        console.error('createSignedUploadUrl error:', error)
        return new Response(JSON.stringify({ error: '生成上传令牌失败' }), { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } })
      }
      uploads.push({ path, token: data.token, signedUrl: data.signedUrl })
    }

    return new Response(JSON.stringify({ success: true, uploads }), { status: 200, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('presign error:', e)
    return new Response(JSON.stringify({ error: '处理请求时出错' }), { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } })
  }
})