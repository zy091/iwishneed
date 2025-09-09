import { supabase } from '@/lib/supabaseClient'
import { Comment } from '@/types/comment'

export const commentsService = {
  async getComments(requirementId: string): Promise<Comment[]> {
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
  },

  async addComment(requirementId: string, content: string, userId: string): Promise<Comment> {
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
  },

  async updateComment(commentId: string, content: string): Promise<Comment> {
    const { data, error } = await supabase
      .from('comments')
      .update({ content })
      .eq('id', commentId)
      .select(`
        *,
        user:users(id, username, role)
      `)
      .single()

    if (error) {
      console.error('更新评论失败:', error)
      throw error
    }

    return data
  },

  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      console.error('删除评论失败:', error)
      throw error
    }
  }
}