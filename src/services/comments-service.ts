import { supabase } from '@/lib/supabaseClient'

export interface Comment {
  id: string
  requirement_id: string
  content: string
  parent_id?: string
  user_id?: string
  user_external_id: string
  user_email: string
  user_email_masked: string
  created_at: string
  updated_at: string
  attachments_count: number
  attachments?: CommentAttachment[]
}

export interface CommentAttachment {
  id: string
  comment_id: string
  file_path: string
  file_name: string
  mime_type: string
  size: number
  created_at: string
}

export interface AddCommentParams {
  requirement_id: string
  content: string
  parent_id?: string
  attachments?: Array<{ path: string; name: string; type: string; size: number }>
}

// Enterprise endpoints (Edge Functions)
const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

async function authHeaderJSON(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('未登录')
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

/**
 * 从会话中获取用户（统一信任 Supabase 会话）
 */
export async function getUserInfoFromToken(): Promise<{ id: string; email: string } | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.id || !user.email) return null
    return { id: String(user.id), email: String(user.email) }
  } catch {
    return null
  }
}

/**
 * 邮箱脱敏处理
 */
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '匿名用户'
  const [local, domain] = email.split('@')
  if (local.length <= 2) return `${local[0]}***@${domain}`
  const masked = local[0] + '*'.repeat(Math.min(local.length - 2, 3)) + local[local.length - 1]
  return `${masked}@${domain}`
}

/**
 * 获取需求的评论列表（包含附件）
 * 企业方案建议：后端提供 comments-list 函数；目前先保留视图优先、表回退
 */
export async function getComments(requirement_id: string): Promise<Comment[]> {
  // 优先从视图读取，失败则回退到基础表
  let rows: any[] = []
  {
    const { data, error } = await supabase
      .from('comments_public')
      .select('*')
      .eq('requirement_id', requirement_id)
      .order('created_at', { ascending: false })
    if (!error && data) {
      rows = data as any[]
    } else {
      console.warn('comments_public 查询失败，回退到 comments:', error?.message)
      const { data: data2, error: err2 } = await supabase
        .from('comments')
        .select('*')
        .eq('requirement_id', requirement_id)
        .order('created_at', { ascending: false })
      if (err2) {
        console.error('获取评论失败:', err2)
        throw err2
      }
      rows = (data2 as any[]) || []
      // 回退数据无脱敏字段，补充 user_email_masked
      rows = rows.map((r: any) => ({ ...r, user_email_masked: maskEmail(r.user_email || '') }))
    }
  }

  // 组装附件（若存在附件计数）
  const comments: Comment[] = rows as any
  const needIds = comments.filter((c) => (c.attachments_count || 0) > 0).map((c) => c.id)
  if (needIds.length) {
    // 优先视图，失败则回退到表
    let attaches: CommentAttachment[] = []
    {
      const { data, error } = await supabase
        .from('comment_attachments_public')
        .select('*')
        .in('comment_id', needIds)
      if (!error && data) {
        attaches = data as any
      } else {
        console.warn('comment_attachments_public 查询失败，回退到 comment_attachments:', error?.message)
        const { data: data2, error: err2 } = await supabase
          .from('comment_attachments')
          .select('*')
          .in('comment_id', needIds)
        if (!err2 && data2) {
          attaches = data2 as any
        }
      }
    }
    if (attaches?.length) {
      const map = new Map<string, CommentAttachment[]>()
      for (const a of attaches) {
        const arr = map.get(a.comment_id) || []
        arr.push(a)
        map.set(a.comment_id, arr)
      }
      for (const c of comments) {
        c.attachments = map.get(c.id) || []
      }
    }
  }

  return comments
}

/**
 * 使用 signedUrl/token 上传文件到存储
 */
export async function uploadToSignedUrls(
  bucket: string,
  items: Array<{ path: string; token: string }>,
  files: File[]
): Promise<Array<{ path: string; name: string; type: string; size: number }>> {
  const results: Array<{ path: string; name: string; type: string; size: number }> = []
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const f = files[i]
    const { error } = await supabase.storage.from(bucket).uploadToSignedUrl(it.path, it.token, f)
    if (error) {
      console.error('uploadToSignedUrl error:', error)
      throw error
    }
    results.push({ path: it.path, name: f.name, type: f.type, size: f.size })
  }
  return results
}

/**
 * 企业方案：通过 Edge Function 添加评论（后端校验/记录/Audit），失败时回退直连
 */
export async function addComment(params: AddCommentParams): Promise<Comment> {
  const userInfo = await getUserInfoFromToken()
  if (!userInfo) {
    throw new Error('用户未登录或令牌无效')
  }

  // 方案E：Edge Function 优先
  try {
    const headers = await authHeaderJSON()
    const res = await fetch(`${FN_BASE}/comments-add`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        requirement_id: params.requirement_id,
        content: params.content,
        parent_id: params.parent_id ?? null,
        attachments: params.attachments ?? [],
      }),
    })
    if (res.ok) {
      const payload = await res.json().catch(() => ({}))
      const raw = (payload?.comment ?? payload) as any
      if (raw && raw.id) {
        return {
          id: raw.id,
          requirement_id: raw.requirement_id ?? params.requirement_id,
          content: raw.content ?? params.content,
          parent_id: raw.parent_id ?? params.parent_id,
          user_external_id: raw.user_external_id ?? userInfo.id,
          user_email: raw.user_email ?? userInfo.email,
          user_email_masked: raw.user_email_masked ?? maskEmail(raw.user_email ?? userInfo.email),
          created_at: raw.created_at ?? new Date().toISOString(),
          updated_at: raw.updated_at ?? raw.created_at ?? new Date().toISOString(),
          attachments_count: Number(raw.attachments_count ?? (params.attachments?.length || 0)),
          attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
        }
      }
    } else {
      const txt = await res.text().catch(() => '')
      console.warn('comments-add 调用失败:', res.status, txt)
    }
  } catch (err) {
    console.warn('comments-add 异常:', (err as any)?.message || err)
  }

  // 方案F：回退（直连数据库）——完整插入 → 最小字段回退
  let comment: any | null = null
  let errMsg: string | null = null

  // 完整字段
  {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        requirement_id: params.requirement_id,
        content: params.content,
        parent_id: params.parent_id,
        user_id: userInfo.id,
        user_external_id: userInfo.id,
        user_email: userInfo.email,
        attachments_count: params.attachments?.length || 0,
      })
      .select()
      .maybeSingle()
    if (!error && data) {
      comment = data
    } else {
      errMsg = error?.message || 'insert failed'
    }
  }

  // 最小字段回退
  if (!comment) {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        requirement_id: params.requirement_id,
        content: params.content,
        parent_id: params.parent_id,
        attachments_count: params.attachments?.length || 0,
      })
      .select()
      .maybeSingle()
    if (!error && data) {
      comment = data
      errMsg = null
    }
  }

  if (!comment) {
    console.error('添加评论失败:', errMsg)
    throw new Error('添加评论失败')
  }

  if (params.attachments && params.attachments.length > 0) {
    const attachmentRecords = params.attachments.map(att => ({
      comment_id: comment.id,
      file_path: att.path,
      file_name: att.name,
      mime_type: att.type,
      size: att.size,
    }))

    const { error: attachError } = await supabase.from('comment_attachments').insert(attachmentRecords)
    if (attachError) console.error('添加附件失败:', attachError) // 不抛出，评论已成功
  }

  return {
    id: comment.id,
    requirement_id: comment.requirement_id,
    content: comment.content,
    parent_id: comment.parent_id,
    user_external_id: comment.user_external_id || userInfo.id,
    user_email: comment.user_email || userInfo.email,
    user_email_masked: maskEmail(comment.user_email || userInfo.email),
    created_at: comment.created_at,
    updated_at: comment.updated_at,
    attachments_count: comment.attachments_count ?? (params.attachments?.length || 0),
    attachments: [] as any,
  }
}

/**
 * 企业方案：通过 Edge Function 删除评论，失败时回退直连删除
 */
export async function deleteComment(commentId: string): Promise<boolean> {
  const userInfo = await getUserInfoFromToken()
  if (!userInfo) {
    throw new Error('用户未登录或令牌无效')
  }

  // Edge Function 优先
  try {
    const headers = await authHeaderJSON()
    const res = await fetch(`${FN_BASE}/comments-delete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ comment_id: commentId }),
    })
    if (res.ok) {
      return true
    } else {
      const txt = await res.text().catch(() => '')
      console.warn('comments-delete 调用失败:', res.status, txt)
    }
  } catch (err) {
    console.warn('comments-delete 异常:', (err as any)?.message || err)
  }

  // 回退：直连数据库删除（含权限检查）
  // 先检查评论是否存在
  const { data: comment, error: fetchError } = await supabase
    .from('comments')
    .select('id, user_id, user_external_id')
    .eq('id', commentId)
    .single()

  if (fetchError) {
    console.error('获取评论失败:', fetchError)
    throw new Error('评论不存在或已被删除')
  }

  // 检查用户是否为管理员
  const { data: isAdminResult } = await supabase.rpc('is_admin')
  const isAdmin = isAdminResult === true

  // 检查权限：管理员可以删除任何评论，普通用户只能删除自己的评论
  const canDelete = isAdmin || comment.user_id === userInfo.id || comment.user_external_id === userInfo.id
  if (!canDelete) {
    throw new Error('您没有权限删除此评论')
  }

  // 删除附件记录
  const { error: attachError } = await supabase.from('comment_attachments').delete().eq('comment_id', commentId)
  if (attachError) console.error('删除附件记录失败:', attachError)

  // 删除子评论
  const { error: childError } = await supabase.from('comments').delete().eq('parent_id', commentId)
  if (childError) console.error('删除子评论失败:', childError)

  // 删除主评论
  const { error } = await supabase.from('comments').delete().eq('id', commentId)
  if (error) {
    console.error('删除评论失败:', error)
    throw new Error('删除评论失败: ' + error.message)
  }

  return true
}

/**
 * 企业方案：获取附件的签名URL通过 Edge Function，失败时回退 storage
 */
export async function getAttachmentSignedUrl(path: string): Promise<string> {
  // Edge Function 优先
  try {
    const headers = await authHeaderJSON()
    const res = await fetch(`${FN_BASE}/comments-file-url`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ path, expiresIn: 3600 }),
    })
    if (res.ok) {
      const { url } = await res.json()
      if (url) return url
    } else {
      const txt = await res.text().catch(() => '')
      console.warn('comments-file-url 调用失败:', res.status, txt)
    }
  } catch (err) {
    console.warn('comments-file-url 异常:', (err as any)?.message || err)
  }

  // 回退：直连 storage
  const { data, error } = await supabase.storage.from('comments-attachments').createSignedUrl(path, 3600)
  if (error) {
    console.error('获取签名URL失败:', error)
    throw new Error(`获取文件URL失败: ${error.message}`)
  }
  if (!data?.signedUrl) {
    throw new Error('未能获取有效的签名URL')
  }
  return data.signedUrl
}

/**
 * 企业方案：生成文件上传预签名（由 Edge Function 返回 token），失败回退 storage
 */
export async function presignUploads(
  requirement_id: string,
  files: Array<{ name: string; type: string; size: number }>
): Promise<Array<{ path: string; token: string }>> {
  // Edge Function 优先
  try {
    const headers = await authHeaderJSON()
    const res = await fetch(`${FN_BASE}/comments-upload-presign`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ requirement_id, files }),
    })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) {
        // 期望 [{ path, token }]
        return data
      } else if (Array.isArray(data?.items)) {
        return data.items
      }
    } else {
      const txt = await res.text().catch(() => '')
      console.warn('comments-upload-presign 调用失败:', res.status, txt)
    }
  } catch (err) {
    console.warn('comments-upload-presign 异常:', (err as any)?.message || err)
  }

  // 回退：前端自行生成路径并创建签名上传
  const results: Array<{ path: string; token: string }> = []
  for (const file of files) {
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const ext = file.name.includes('.') ? (file.name.split('.').pop() || '') : ''
    const filePath = `${requirement_id}/${timestamp}_${randomId}${ext ? '.' + ext : ''}`

    const { data, error } = await supabase.storage.from('comments-attachments').createSignedUploadUrl(filePath)
    if (error) {
      console.error('创建预签名URL失败:', error)
      throw new Error(`创建预签名URL失败: ${error.message}`)
    }
    results.push({ path: filePath, token: data.token })
  }
  return results
}

/**
 * 检查用户是否可以添加评论（异步）
 */
export async function canAddComment(): Promise<boolean> {
  const u = await getUserInfoFromToken()
  return !!u
}