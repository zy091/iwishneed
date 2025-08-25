// 评论添加 Edge Function（支持一级回复与附件）
// 验证主项目访问令牌并添加评论与附件元数据

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const mainSupabaseUrl = Deno.env.get('MAIN_SUPABASE_URL') || ''
const mainSupabaseAnonKey = Deno.env.get('MAIN_SUPABASE_ANON_KEY') || ''
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').filter(Boolean)
const BUCKET = 'comments-attachments'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function isAllowed(req: Request) {
  const origin = req.headers.get('origin') || ''
  return allowedOrigins.length === 0 || allowedOrigins.some((a) => origin === a || origin.endsWith(a))
}

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Main-Access-Token',
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
  if (req.method !== 'POST') {
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
    const body = await req.json()
    const requirement_id: string = body?.requirement_id
    const content: string = body?.content
    const parent_id: string | null = body?.parent_id ?? null
    const attachments: Array<{ path: string; name: string; type: string; size: number }> = Array.isArray(body?.attachments)
      ? body.attachments
      : []

    if (!requirement_id || !content) {
      return new Response(JSON.stringify({ error: '缺少必要参数' }), {
        status: 400,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    // 插入评论
    const { data: insertedRows, error: insertErr } = await supabase
      .from('comments')
      .insert({
        requirement_id,
        content,
        user_external_id: user.id,
        user_email: user.email,
        parent_id: parent_id,
        attachments_count: attachments.length || 0,
      })
      .select('*')

    if (insertErr || !insertedRows || insertedRows.length === 0) {
      console.error('添加评论失败:', insertErr)
      return new Response(JSON.stringify({ error: '添加评论失败' }), {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    const comment = insertedRows[0]

    // 写入附件元数据
    if (attachments.length > 0) {
      const rows = attachments.map((a) => ({
        comment_id: comment.id,
        file_path: a.path,
        file_name: a.name,
        mime_type: a.type,
        size: a.size,
      }))
      const { error: attachErr } = await supabase.from('comment_attachments').insert(rows)
      if (attachErr) {
        console.error('写入附件元数据失败:', attachErr)
        // 不回滚评论，以免影响主流程
      }
    }

    // 返回匿名视图行
    const { data: masked, error: viewErr } = await supabase
      .from('comments_public')
      .select('*')
      .eq('id', comment.id)
      .single()

    if (viewErr || !masked) {
      console.error('查询匿名视图失败:', viewErr)
      return new Response(JSON.stringify({ error: '添加成功但查询视图失败' }), {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, data: masked }), {
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