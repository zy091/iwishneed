// 评论删除 Edge Function（支持管理员删除与清理附件）
// 验证主项目访问令牌并删除评论（本人可删；role_id=0 或 ADMIN_EMAILS 可删任意评论）

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const mainSupabaseUrl = Deno.env.get('MAIN_SUPABASE_URL') || ''
const mainSupabaseAnonKey = Deno.env.get('MAIN_SUPABASE_ANON_KEY') || ''
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').filter(Boolean)
const ADMIN_EMAILS = (Deno.env.get('ADMIN_EMAILS') || '').split(',').map((s) => s.trim()).filter(Boolean)
const BUCKET = 'comments-attachments'

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
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Main-Access-Token, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}

type MainUser = { id: string; email: string; role_id?: number | null }

async function verifyMainAccessToken(token: string): Promise<MainUser | null> {
  if (!token || !mainSupabaseUrl || !mainSupabaseAnonKey) return null
  try {
    const res = await fetch(`${mainSupabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: mainSupabaseAnonKey },
    })
    if (!res.ok) return null
    const j = await res.json()
    const metaRole =
      (j?.user_metadata?.role_id ?? j?.app_metadata?.role_id ?? j?.user_metadata?.roleId ?? j?.app_metadata?.roleId)
    const parsed = typeof metaRole === 'string' ? parseInt(metaRole) : (typeof metaRole === 'number' ? metaRole : null)
    return { id: j.id, email: j.email, role_id: Number.isFinite(parsed as any) ? (parsed as number) : null }
  } catch {
    return null
  }
}

function isAdmin(user: MainUser): boolean {
  if (user.role_id === 0) return true
  if (user.email && ADMIN_EMAILS.includes(user.email)) return true
  return false
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }
  if (!isAllowed(req)) {
    return new Response(JSON.stringify({ error: '不允许的来源' }), {
      status: 403,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
  if (req.method !== 'DELETE') {
    return new Response(JSON.stringify({ error: '方法不允许' }), {
      status: 405,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  const token = req.headers.get('X-Main-Access-Token') || ''
  const user = await verifyMainAccessToken(token)
  if (!user) {
    return new Response(JSON.stringify({ error: '主项目访问令牌无效' }), {
      status: 401,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }

  try {
    const url = new URL(req.url)
    const commentId = url.searchParams.get('id')
    if (!commentId) {
      return new Response(JSON.stringify({ error: '缺少评论 ID' }), {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // 获取评论
    const { data: comment, error: fetchErr } = await supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .single()

    if (fetchErr || !comment) {
      return new Response(JSON.stringify({ error: '评论不存在' }), {
        status: 404,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const admin = isAdmin(user)
    const owner = comment.user_external_id === user.id
    if (!admin && !owner) {
      return new Response(JSON.stringify({ error: '您无权删除此评论' }), {
        status: 403,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // 需要删除的评论ID集合：该评论 + 其一级回复
    const { data: relatedIds, error: relErr } = await supabase
      .from('comments')
      .select('id')
      .or(`id.eq.${commentId},parent_id.eq.${commentId}`)

    if (relErr) {
      console.error('查询关联评论失败:', relErr)
    }

    const ids = (relatedIds || []).map((r: any) => r.id)
    if (!ids.includes(commentId)) ids.push(commentId)

    // 找到所有附件路径
    let paths: string[] = []
    if (ids.length > 0) {
      const { data: attaches, error: attErr } = await supabase
        .from('comment_attachments')
        .select('file_path')
        .in('comment_id', ids)

      if (attErr) {
        console.error('查询附件失败:', attErr)
      } else {
        paths = (attaches || []).map((a: any) => a.file_path).filter(Boolean)
      }
    }

    // 先删除存储中的文件（忽略单个失败避免阻断）
    if (paths.length > 0) {
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove(paths)
      if (rmErr) {
        console.error('删除存储文件出错:', rmErr)
      }
    }

    // 删除评论（及其回复，附件记录将因外键级联被删除）
    const { error: delErr } = await supabase.from('comments').delete().in('id', ids)
    if (delErr) {
      console.error('删除评论失败:', delErr)
      return new Response(JSON.stringify({ error: '删除评论失败' }), {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('处理请求时出错:', e)
    return new Response(JSON.stringify({ error: '处理请求时出错' }), {
      status: 500,
      headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
    })
  }
})