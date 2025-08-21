// 评论删除 Edge Function
// 验证主项目访问令牌并删除评论（仅允许删除自己的评论）

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// 环境变量
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const mainSupabaseUrl = Deno.env.get('MAIN_SUPABASE_URL') || 'https://oziqjzzrouoclocfgoub.supabase.com'
const mainSupabaseAnonKey = Deno.env.get('MAIN_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96aXFqenpyb3VvY2xvY2Znb3ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4NDE3NzAsImV4cCI6MjA1NTQxNzc3MH0.2PoPYqOq0SAev20WEvUCJer7JmBmCxv36-IE8uLizr4'

// 允许的来源域名
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').filter(Boolean)

// 创建 Supabase 客户端（使用服务角色密钥）
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 验证主项目访问令牌
async function verifyMainAccessToken(token: string): Promise<{ id: string; email: string } | null> {
  if (!token || !mainSupabaseUrl || !mainSupabaseAnonKey) {
    console.error('缺少验证所需的配置或令牌')
    return null
  }

  try {
    // 调用主项目的 Auth API 验证令牌
    const response = await fetch(`${mainSupabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': mainSupabaseAnonKey
      }
    })

    if (!response.ok) {
      console.error('主项目令牌验证失败:', response.status, await response.text())
      return null
    }

    const userData = await response.json()
    return {
      id: userData.id,
      email: userData.email
    }
  } catch (error) {
    console.error('验证主项目令牌时出错:', error)
    return null
  }
}

// 处理 CORS 预检请求
function handleCorsPreflightRequest(req: Request): Response {
  const origin = req.headers.get('origin') || ''
  
  // 检查来源是否在允许列表中
  const isAllowedOrigin = allowedOrigins.length === 0 || 
    allowedOrigins.some(allowed => origin === allowed || origin.endsWith(allowed))
  
  if (!isAllowedOrigin) {
    return new Response('不允许的来源', { status: 403 })
  }

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Main-Access-Token',
      'Access-Control-Max-Age': '86400'
    }
  })
}

// 添加 CORS 头到响应
function addCorsHeaders(response: Response, origin: string): Response {
  const headers = new Headers(response.headers)
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Main-Access-Token')
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

// 主处理函数
serve(async (req) => {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req)
  }

  const origin = req.headers.get('origin') || ''
  
  // 检查来源是否在允许列表中
  const isAllowedOrigin = allowedOrigins.length === 0 || 
    allowedOrigins.some(allowed => origin === allowed || origin.endsWith(allowed))
  
  if (!isAllowedOrigin) {
    return addCorsHeaders(
      new Response(JSON.stringify({ error: '不允许的来源' }), { 
        status: 403, 
        headers: { 'Content-Type': 'application/json' } 
      }),
      origin
    )
  }

  // 只允许 DELETE 请求
  if (req.method !== 'DELETE') {
    return addCorsHeaders(
      new Response(JSON.stringify({ error: '方法不允许' }), { 
        status: 405, 
        headers: { 'Content-Type': 'application/json' } 
      }),
      origin
    )
  }

  // 获取主项目访问令牌
  const mainAccessToken = req.headers.get('X-Main-Access-Token')
  if (!mainAccessToken) {
    return addCorsHeaders(
      new Response(JSON.stringify({ error: '未提供主项目访问令牌' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      }),
      origin
    )
  }

  // 验证主项目访问令牌
  const userData = await verifyMainAccessToken(mainAccessToken)
  if (!userData) {
    return addCorsHeaders(
      new Response(JSON.stringify({ error: '主项目访问令牌无效' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      }),
      origin
    )
  }

  try {
    // 从 URL 获取评论 ID
    const url = new URL(req.url)
    const commentId = url.searchParams.get('id')
    
    if (!commentId) {
      return addCorsHeaders(
        new Response(JSON.stringify({ error: '缺少评论 ID' }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }),
        origin
      )
    }

    // 首先检查评论是否存在且属于当前用户
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .eq('user_external_id', userData.id)
      .single()

    if (fetchError || !comment) {
      return addCorsHeaders(
        new Response(JSON.stringify({ error: '评论不存在或您无权删除' }), { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' } 
        }),
        origin
      )
    }

    // 删除评论
    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_external_id', userData.id)

    if (deleteError) {
      console.error('删除评论失败:', deleteError)
      return addCorsHeaders(
        new Response(JSON.stringify({ error: '删除评论失败' }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }),
        origin
      )
    }

    return addCorsHeaders(
      new Response(JSON.stringify({ success: true }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }),
      origin
    )
  } catch (error) {
    console.error('处理请求时出错:', error)
    return addCorsHeaders(
      new Response(JSON.stringify({ error: '处理请求时出错' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }),
      origin
    )
  }
})