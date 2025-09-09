import { supabase } from '@/lib/supabaseClient'

export interface Comment {
  id: string
  requirement_id: string
  content: string
  user_id: string
  created_at: string
  updated_at: string
  user?: {
    id: string
    username: string
    role: string
  }
  attachments?: Array<{
    id: string
    filename: string
    url: string
    size: number
  }>
}

export const getComments = async (requirementId: string): Promise<Comment[]> => {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      user:users(id, username, role)
    `)
    .eq('requirement_id', requirementId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('获取评论失败:', error)
    throw error
  }

  return data || []
}

export const addComment = async (requirementId: string, content: string, userId: string): Promise<Comment> => {
  const { data, error } = await supabase
    .from('comments')
    .insert({
      requirement_id: requirementId,
      content,
      user_id: userId
    })
    .select(`
      *,
      user:users(id, username, role)
    `)
    .single()

  if (error) {
    console.error('添加评论失败:', error)
    throw error
  }

  return data
}

export const deleteComment = async (commentId: string): Promise<void> => {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)

  if (error) {
    console.error('删除评论失败:', error)
    throw error
  }
}

export const presignUploads = async (files: Array<{ name: string; type: string; size: number }>) => {
  // 模拟预签名上传
  return files.map(file => ({
    signedUrl: `https://example.com/upload/${file.name}`,
    fileId: Math.random().toString(36).substr(2, 9)
  }))
}

export const uploadToSignedUrls = async (files: File[], signedUrls: string[]) => {
  // 模拟上传到预签名URL
  return files.map((file, index) => ({
    success: true,
    url: signedUrls[index]
  }))
}

export const getAttachmentSignedUrl = async (attachmentId: string) => {
  // 模拟获取附件签名URL
  return `https://example.com/attachment/${attachmentId}`
}

export const commentsService = {
  getComments,
  addComment,
  deleteComment,
  presignUploads,
  uploadToSignedUrls,
  getAttachmentSignedUrl
}