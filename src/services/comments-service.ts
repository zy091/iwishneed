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
 */
export async function getComments(requirement_id: string): Promise<Comment[]> {
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
 * 添加评论（直接数据库操作）
 */
export async function addComment(params: AddCommentParams): Promise<Comment> {
  const userInfo = await getUserInfoFromToken()
  if (!userInfo) {
    throw new Error('用户未登录或令牌无效')
  }

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({
      requirement_id: params.requirement_id,
      content: params.content,
      parent_id: params.parent_id,
      user_id: userInfo.id,
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
      // 不抛出，评论已成功
    }
  }

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
    attachments: [] as any
  }
}

/**
 * 删除评论（直接数据库操作）
 */
export async function deleteComment(commentId: string): Promise<boolean> {
  const userInfo = await getUserInfoFromToken()
  if (!userInfo) {
    throw new Error('用户未登录或令牌无效')
  }

  const { error: attachError } = await supabase
    .from('comment_attachments')
    .delete()
    .eq('comment_id', commentId)
  if (attachError) console.error('删除附件记录失败:', attachError)

  const { error: childError } = await supabase
    .from('comments')
    .delete()
    .eq('parent_id', commentId)
  if (childError) console.error('删除子评论失败:', childError)

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .or(`user_id.eq.${userInfo.id},user_external_id.eq.${userInfo.id}`)
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
  const { data, error } = await supabase.storage
    .from('comments-attachments')
    .createSignedUrl(path, 3600)
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
 * 生成文件上传预签名URL
 */
export async function presignUploads(
  requirement_id: string,
  files: Array<{ name: string; type: string; size: number }>
): Promise<Array<{ path: string; token: string }>> {
  const results: Array<{ path: string; token: string }> = []
  for (const file of files) {
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const fileName = file.name || 'unknown'
    const ext = fileName.includes('.') ? (fileName.split('.').pop() || '') : ''
    const filePath = `${requirement_id}/${timestamp}_${randomId}${ext ? '.' + ext : ''}`

    const { data, error } = await supabase.storage
      .from('comments-attachments')
      .createSignedUploadUrl(filePath)
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