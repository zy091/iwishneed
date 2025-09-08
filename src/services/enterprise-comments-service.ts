import { supabase } from '@/lib/supabaseClient'
import type { Comment, CommentAttachment } from '@/types/requirement'

// =====================================================
// 企业级评论服务 - 支持技术部和创意部需求
// =====================================================

export interface AddCommentParams {
  requirement_id: string
  requirement_type: 'tech' | 'creative'
  content: string
  parent_id?: string
  attachments?: Array<{ path: string; name: string; type: string; size: number }>
}

/**
 * 从会话中获取用户信息
 */
async function getUserInfoFromToken(): Promise<{ id: string; email: string; name: string; avatar?: string } | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.id || !user.email) return null
    
    const name = user.user_metadata?.full_name || 
                 user.user_metadata?.name || 
                 user.email.split('@')[0] || 
                 '用户'
    
    const avatar = user.user_metadata?.avatar_url || 
                   user.user_metadata?.picture

    return { 
      id: String(user.id), 
      email: String(user.email),
      name,
      avatar
    }
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

class EnterpriseCommentsService {
  /**
   * 获取需求的评论列表（包含附件）
   */
  async getComments(requirementId: string, requirementType?: 'tech' | 'creative'): Promise<Comment[]> {
    let query = supabase
      .from('comments')
      .select(`
        *,
        comment_attachments (*)
      `)
      .eq('requirement_id', requirementId)
      .order('created_at', { ascending: true })

    if (requirementType) {
      query = query.eq('requirement_type', requirementType)
    }

    const { data, error } = await query

    if (error) {
      console.error('获取评论失败:', error)
      throw error
    }

    return (data || []).map(comment => ({
      ...comment,
      attachments: comment.comment_attachments || []
    }))
  }

  /**
   * 添加评论
   */
  async addComment(params: AddCommentParams): Promise<Comment> {
    const userInfo = await getUserInfoFromToken()
    if (!userInfo) {
      throw new Error('用户未登录或令牌无效')
    }

    const commentData = {
      requirement_id: params.requirement_id,
      requirement_type: params.requirement_type,
      content: params.content,
      parent_id: params.parent_id,
      author_id: userInfo.id,
      author_name: userInfo.name,
      author_avatar: userInfo.avatar
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert(commentData)
      .select()
      .single()

    if (error) {
      console.error('添加评论失败:', error)
      throw new Error('添加评论失败')
    }

    // 添加附件
    if (params.attachments && params.attachments.length > 0) {
      const attachmentRecords = params.attachments.map(att => ({
        comment_id: comment.id,
        file_name: att.name,
        file_url: att.path,
        file_type: att.type,
        file_size: att.size
      }))

      const { error: attachError } = await supabase
        .from('comment_attachments')
        .insert(attachmentRecords)

      if (attachError) {
        console.error('添加附件失败:', attachError)
        // 不抛出错误，评论已成功添加
      }
    }

    return {
      ...comment,
      attachments: []
    }
  }

  /**
   * 更新评论
   */
  async updateComment(commentId: string, content: string): Promise<Comment> {
    const userInfo = await getUserInfoFromToken()
    if (!userInfo) {
      throw new Error('用户未登录或令牌无效')
    }

    // 检查权限
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('author_id')
      .eq('id', commentId)
      .single()

    if (fetchError) {
      throw new Error('评论不存在或已被删除')
    }

    // 检查是否为管理员
    const { data: isAdminResult } = await supabase.rpc('is_admin')
    const isAdmin = isAdminResult === true
    
    if (!isAdmin && comment.author_id !== userInfo.id) {
      throw new Error('您没有权限修改此评论')
    }

    const { data, error } = await supabase
      .from('comments')
      .update({ content })
      .eq('id', commentId)
      .select()
      .single()

    if (error) {
      console.error('更新评论失败:', error)
      throw new Error('更新评论失败')
    }

    return {
      ...data,
      attachments: []
    }
  }

  /**
   * 删除评论
   */
  async deleteComment(commentId: string): Promise<boolean> {
    const userInfo = await getUserInfoFromToken()
    if (!userInfo) {
      throw new Error('用户未登录或令牌无效')
    }

    // 检查评论是否存在
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('id, author_id')
      .eq('id', commentId)
      .single()

    if (fetchError) {
      throw new Error('评论不存在或已被删除')
    }

    // 检查是否为管理员
    const { data: isAdminResult } = await supabase.rpc('is_admin')
    const isAdmin = isAdminResult === true
    
    if (!isAdmin && comment.author_id !== userInfo.id) {
      throw new Error('您没有权限删除此评论')
    }

    // 删除附件记录
    const { error: attachError } = await supabase
      .from('comment_attachments')
      .delete()
      .eq('comment_id', commentId)
    
    if (attachError) {
      console.error('删除附件记录失败:', attachError)
    }

    // 删除评论
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
    
    if (error) {
      console.error('删除评论失败:', error)
      throw new Error('删除评论失败: ' + error.message)
    }
    
    return true
  }

  /**
   * 添加附件
   */
  async addAttachment(commentId: string, attachment: Omit<CommentAttachment, 'id' | 'comment_id' | 'created_at'>): Promise<CommentAttachment> {
    const { data, error } = await supabase
      .from('comment_attachments')
      .insert({
        ...attachment,
        comment_id: commentId
      })
      .select()
      .single()

    if (error) {
      console.error('添加附件失败:', error)
      throw error
    }
    
    return data
  }

  /**
   * 删除附件
   */
  async deleteAttachment(attachmentId: string): Promise<void> {
    const { error } = await supabase
      .from('comment_attachments')
      .delete()
      .eq('id', attachmentId)

    if (error) {
      console.error('删除附件失败:', error)
      throw error
    }
  }

  /**
   * 获取附件的签名URL
   */
  async getAttachmentSignedUrl(path: string): Promise<string> {
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
  async presignUploads(
    requirementId: string,
    files: Array<{ name: string; type: string; size: number }>
  ): Promise<Array<{ path: string; token: string }>> {
    const results: Array<{ path: string; token: string }> = []
    
    for (const file of files) {
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 15)
      const fileName = file.name || 'unknown'
      const ext = fileName.includes('.') ? (fileName.split('.').pop() || '') : ''
      const filePath = `${requirementId}/${timestamp}_${randomId}${ext ? '.' + ext : ''}`

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
   * 使用签名URL上传文件
   */
  async uploadToSignedUrls(
    bucket: string,
    items: Array<{ path: string; token: string }>,
    files: File[]
  ): Promise<Array<{ path: string; name: string; type: string; size: number }>> {
    const results: Array<{ path: string; name: string; type: string; size: number }> = []
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const file = files[i]
      
      const { error } = await supabase.storage
        .from(bucket)
        .uploadToSignedUrl(item.path, item.token, file)
      
      if (error) {
        console.error('uploadToSignedUrl error:', error)
        throw error
      }
      
      results.push({ 
        path: item.path, 
        name: file.name, 
        type: file.type, 
        size: file.size 
      })
    }
    
    return results
  }

  /**
   * 批量删除需求的所有评论
   */
  async deleteCommentsByRequirement(requirementId: string): Promise<void> {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('requirement_id', requirementId)

    if (error) {
      console.error('批量删除评论失败:', error)
      throw error
    }
  }

  /**
   * 获取评论统计
   */
  async getCommentsStats(requirementId?: string): Promise<{
    total: number
    byRequirement: Record<string, number>
    byType: Record<string, number>
  }> {
    let query = supabase
      .from('comments')
      .select('requirement_id, requirement_type')

    if (requirementId) {
      query = query.eq('requirement_id', requirementId)
    }

    const { data, error } = await query
    if (error) {
      console.error('获取评论统计失败:', error)
      throw error
    }

    const total = data?.length || 0
    const byRequirement: Record<string, number> = {}
    const byType: Record<string, number> = {}

    for (const comment of data || []) {
      const reqId = comment.requirement_id
      const reqType = comment.requirement_type
      
      byRequirement[reqId] = (byRequirement[reqId] || 0) + 1
      byType[reqType] = (byType[reqType] || 0) + 1
    }

    return { total, byRequirement, byType }
  }

  /**
   * 检查用户是否可以添加评论
   */
  async canAddComment(): Promise<boolean> {
    const userInfo = await getUserInfoFromToken()
    return !!userInfo
  }

  /**
   * 检查用户是否可以管理评论（删除/修改他人评论）
   */
  async canManageComments(): Promise<boolean> {
    const { data: isAdminResult } = await supabase.rpc('is_admin')
    return isAdminResult === true
  }
}

// 导出单例实例
export const enterpriseCommentsService = new EnterpriseCommentsService()

// 向后兼容的导出
export { enterpriseCommentsService as commentsService }

// 导出类型和函数以保持兼容性
export type { AddCommentParams }
export { 
  enterpriseCommentsService as default,
  getUserInfoFromToken,
  maskEmail
}