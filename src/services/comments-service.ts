/**
 * 评论服务（扩展：一级回复与附件）
 */

import { supabase } from '@/lib/supabaseClient'
import { getMainAccessToken } from '@/lib/mainAccessToken'

export interface CommentAttachment {
  id: string
  comment_id: string
  file_path: string
  file_name: string
  mime_type: string
  size: number
  created_at: string
}

export interface Comment {
  id: string
  requirement_id: string
  content: string
  user_id_masked: string
  user_email_masked: string
  parent_id: string | null
  attachments_count: number
  created_at: string
  updated_at: string
  // 聚合后的附件（前端便于渲染）
  attachments?: CommentAttachment[]
}

export interface AddCommentParams {
  requirement_id: string
  content: string
  parent_id?: string | null
  attachments?: Array<{ path: string; name: string; type: string; size: number }>
}

const EDGE_BASE = import.meta.env.VITE_SUPABASE_URL

function mustToken() {
  const t = getMainAccessToken()
  if (!t) throw new Error('缺少主项目访问令牌')
  return t
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

    if (aerr) {
      console.error('获取附件失败:', aerr)
    } else {
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
 * 预签名上传：返回 { path, token, signedUrl }
 */
export async function presignUploads(
  requirement_id: string,
  files: Array<{ name: string; type: string; size: number }>
): Promise<Array<{ path: string; token: string; signedUrl: string }>> {
  const token = mustToken()
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
 * 添加评论（支持 parent_id 与 attachments）
 */
export async function addComment(params: AddCommentParams): Promise<Comment> {
  const mainAccessToken = mustToken()
  const response = await fetch(`${EDGE_BASE}/functions/v1/comments-add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Main-Access-Token': mainAccessToken,
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || '添加评论失败')
  }

  const result = await response.json()
  return result.data as Comment
}

/**
 * 删除评论
 */
export async function deleteComment(commentId: string): Promise<boolean> {
  const mainAccessToken = mustToken()
  const response = await fetch(
    `${EDGE_BASE}/functions/v1/comments-delete?id=${encodeURIComponent(commentId)}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Main-Access-Token': mainAccessToken,
      },
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || '删除评论失败')
  }
  return true
}

/**
 * 生成附件的临时访问地址
 */
export async function getAttachmentSignedUrl(path: string): Promise<string> {
  const token = mustToken()
  const res = await fetch(`${EDGE_BASE}/functions/v1/comments-file-url?path=${encodeURIComponent(path)}`, {
    method: 'GET',
    headers: {
      'X-Main-Access-Token': token,
    },
  })
  if (!res.ok) {
    const j = await res.json().catch(() => ({}))
    throw new Error(j.error || '获取附件地址失败')
  }
  const j = await res.json()
  return j.url as string
}

/**
 * 检查用户是否可以添加评论
 */
export function canAddComment(): boolean {
  return !!getMainAccessToken()
}