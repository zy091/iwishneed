import { supabase } from '@/lib/supabaseClient'
import { getMainAccessToken } from '@/lib/mainAccessToken'

const EDGE_BASE = import.meta.env.VITE_SUPABASE_URL

export interface Comment {
  id: string
  requirement_id: string
  content: string
  parent_id?: string
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

/**
 * 从主访问令牌中解析用户信息
 */
function getUserInfoFromToken(): { id: string; email: string } | null {
  try {
    const token = getMainAccessToken()
    if (!token || typeof token !== 'string') return null
    
    // JWT token 格式: header.payload.signature
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    // 解码 payload (base64url)
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    
    // 确保payload包含必要的字段
    if (!payload || (!payload.sub && !payload.user_id && !payload.id) || !payload.email) {
      return null
    }
    
    return {
      id: payload.sub || payload.user_id || payload.id,
      email: payload.email
    }
  } catch (error) {
    console.error('解析用户令牌失败:', error)
    return null
  }
}

/**
 * 邮箱脱敏处理
 */
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '匿名用户'
  
  const [local, domain] = email.split('@')
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`
  }
  
  const masked = local[0] + '*'.repeat(Math.min(local.length - 2, 3)) + local[local.length - 1]
  return `${masked}@${domain}`
}

/**
 * 获取需求的评论列表（包含附件）
 */
export async function getComments(requirement_id: string): Promise<Comment[]> {
  // 获取评论匿名视图
  const { data, error } = await supabase
    .from('comments_public')
    .select('*')
    .eq('requirement_id', requirement_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('获取评论失败:', error)
    throw error
  }

  const comments: Comment[] = (data as any) || []

  // 批量拉附件
  const needIds = comments.filter((c) => (c.attachments_count || 0) > 0).map((c) => c.id)
  if (needIds.length) {
    const { data: attaches, error: aerr } = await supabase
      .from('comment_attachments_public')
      .select('*')
      .in('comment_id', needIds)

    if (!aerr && attaches) {
      const map = new Map<string, CommentAttachment[]>()
      for (const a of (attaches || []) as CommentAttachment[]) {
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
 * 生成上传预签名URL
 */
export async function getUploadPresignedUrls(
  requirement_id: string,
  files: Array<{ name: string; type: string; size: number }>
): Promise<Array<{ path: string; token: string }>> {
  const token = getMainAccessToken()
  if (!token) {
    throw new Error('No access token available')
  }
  const res = await fetch(`${EDGE_BASE}/functions/v1/comments-upload-presign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Main-Access-Token': token,
    },
    body: JSON.stringify({ requirement_id, files }),
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || '生成上传令牌失败')
  }
  const j = await res.json()
  return j.uploads || []
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
    const { data, error } = await supabase.storage.from(bucket).uploadToSignedUrl(it.path, it.token, f)
    if (error) {
      console.error('uploadToSignedUrl error:', error)
      throw error
    }
    results.push({ path: it.path, name: f.name, type: f.type, size: f.size })
  }
  return results
}

/**
 * 添加评论（直接数据库操作）
 */
export async function addComment(params: AddCommentParams): Promise<Comment> {
  // 获取用户信息
  const userInfo = getUserInfoFromToken()
  if (!userInfo) {
    throw new Error('用户未登录或令牌无效')
  }

  // 插入评论到数据库
  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      requirement_id: params.requirement_id,
      content: params.content,
      parent_id: params.parent_id,
      user_external_id: userInfo.id,
      user_email: userInfo.email,
      attachments_count: params.attachments?.length || 0
    })
    .select()
    .single()

  if (error) {
    console.error('添加评论失败:', error)
    throw new Error('添加评论失败')
  }

  // 如果有附件，插入附件记录
  if (params.attachments && params.attachments.length > 0) {
    const attachmentRecords = params.attachments.map(att => ({
      comment_id: comment.id,
      file_path: att.path,
      file_name: att.name,
      mime_type: att.type,
      size: att.size
    }))

    const { error: attachError } = await supabase
      .from('comment_attachments')
      .insert(attachmentRecords)

    if (attachError) {
      console.error('添加附件失败:', attachError)
      // 不抛出错误，因为评论已经成功添加
    }
  }

  // 返回格式化的评论数据
  return {
    id: comment.id,
    requirement_id: comment.requirement_id,
    content: comment.content,
    parent_id: comment.parent_id,
    user_external_id: comment.user_external_id,
    user_email: comment.user_email,
    user_email_masked: maskEmail(comment.user_email),
    created_at: comment.created_at,
    updated_at: comment.updated_at,
    attachments_count: comment.attachments_count,
    attachments: params.attachments || []
  }
}

/**
 * 删除评论（直接数据库操作）
 */
export async function deleteComment(commentId: string): Promise<boolean> {
  const userInfo = getUserInfoFromToken()
  if (!userInfo) {
    throw new Error('用户未登录或令牌无效')
  }

  // 先删除附件记录
  const { error: attachError } = await supabase
    .from('comment_attachments')
    .delete()
    .eq('comment_id', commentId)

  if (attachError) {
    console.error('删除附件记录失败:', attachError)
  }

  // 删除子评论
  const { error: childError } = await supabase
    .from('comments')
    .delete()
    .eq('parent_id', commentId)

  if (childError) {
    console.error('删除子评论失败:', childError)
  }

  // 删除主评论
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_external_id', userInfo.id) // 只能删除自己的评论

  if (error) {
    console.error('删除评论失败:', error)
    throw new Error('删除评论失败')
  }

  return true
}

/**
 * 获取附件的签名URL
 */
export async function getAttachmentSignedUrl(path: string): Promise<string> {
  const token = getMainAccessToken()
  if (!token) {
    throw new Error('No access token available')
  }
  const res = await fetch(`${EDGE_BASE}/functions/v1/comments-file-url?path=${encodeURIComponent(path)}`, {
    method: 'GET',
    headers: {
      'X-Main-Access-Token': token,
    },
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || '获取文件URL失败')
  }
  const j = await res.json()
  return j.url
}

/**
 * 检查用户是否可以添加评论
 */
export function canAddComment(): boolean {
  return !!getUserInfoFromToken()
}

/**
 * 生成文件上传预签名URL（使用直接Supabase存储操作）
 */
export async function presignUploads(
  files: Array<{ name: string; type: string; size: number }>
): Promise<Array<{ path: string; token: string }>> {
  const results: Array<{ path: string; token: string }> = []
  
  for (const file of files) {
    // 生成唯一的文件路径
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split('.').pop() || ''
    const filePath = `comments/${timestamp}_${randomId}.${fileExtension}`
    
    // 使用Supabase存储创建预签名URL
    const { data, error } = await supabase.storage
      .from('attachments')
      .createSignedUploadUrl(filePath)
    
    if (error) {
      console.error('创建预签名URL失败:', error)
      throw new Error(`创建预签名URL失败: ${error.message}`)
    }
    
    results.push({
      path: filePath,
      token: data.signedUrl
    })
  }
  
  return results
}

