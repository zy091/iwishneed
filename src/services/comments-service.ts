/**
 * 评论服务
 * 提供评论相关的功能，包括添加、删除和获取评论
 */

import { supabase } from '@/lib/supabaseClient'
import { getMainAccessToken } from '@/lib/mainAccessToken'

// 评论类型定义
export interface Comment {
  id: string
  requirement_id: string
  content: string
  user_id_masked: string
  user_email_masked: string
  created_at: string
  updated_at: string
}

// 添加评论请求参数
interface AddCommentParams {
  requirement_id: string
  content: string
}

/**
 * 获取需求的评论列表
 * @param requirement_id 需求ID
 * @returns 评论列表
 */
export async function getComments(requirement_id: string): Promise<Comment[]> {
  try {
    const { data, error } = await supabase
      .from('comments_public')
      .select('*')
      .eq('requirement_id', requirement_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('获取评论失败:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('获取评论时出错:', error)
    throw error
  }
}

/**
 * 添加评论
 * @param params 评论参数
 * @returns 添加的评论
 */
export async function addComment(params: AddCommentParams): Promise<Comment> {
  try {
    const mainAccessToken = getMainAccessToken()
    if (!mainAccessToken) {
      throw new Error('缺少主项目访问令牌，无法添加评论')
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/comments-add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Main-Access-Token': mainAccessToken
      },
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '添加评论失败')
    }

    const result = await response.json()
    return result.data
  } catch (error) {
    console.error('添加评论时出错:', error)
    throw error
  }
}

/**
 * 删除评论
 * @param commentId 评论ID
 * @returns 是否成功
 */
export async function deleteComment(commentId: string): Promise<boolean> {
  try {
    const mainAccessToken = getMainAccessToken()
    if (!mainAccessToken) {
      throw new Error('缺少主项目访问令牌，无法删除评论')
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/comments-delete?id=${encodeURIComponent(commentId)}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Main-Access-Token': mainAccessToken
        }
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '删除评论失败')
    }

    return true
  } catch (error) {
    console.error('删除评论时出错:', error)
    throw error
  }
}

/**
 * 检查用户是否可以添加评论
 * @returns 是否可以添加评论
 */
export function canAddComment(): boolean {
  return !!getMainAccessToken()
}