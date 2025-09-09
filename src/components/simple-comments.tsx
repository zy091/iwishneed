import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/use-auth-fixed'

interface Comment {
  id: string
  content: string
  user_id: string
  user_name: string
  created_at: string
  updated_at: string
}

interface SimpleCommentsProps {
  requirementId: string
}

export const SimpleComments: React.FC<SimpleCommentsProps> = ({ requirementId }) => {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 获取评论列表
  const fetchComments = async () => {
    if (!requirementId) return
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 获取评论列表，需求ID:', requirementId)
      
      // 直接查询 comments 表，不使用复杂的 RPC 函数
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          user_id,
          created_at,
          updated_at,
          profiles!comments_user_id_fkey (
            name
          )
        `)
        .eq('requirement_id', requirementId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('❌ 获取评论失败:', error)
        setError(`获取评论失败: ${error.message}`)
        return
      }

      // 处理数据格式
      const formattedComments: Comment[] = (data || []).map(comment => ({
        id: comment.id,
        content: comment.content,
        user_id: comment.user_id,
        user_name: (comment.profiles as any)?.name || '未知用户',
        created_at: comment.created_at,
        updated_at: comment.updated_at
      }))

      console.log('✅ 成功获取评论:', formattedComments.length, '条')
      setComments(formattedComments)
      
    } catch (err: any) {
      console.error('❌ 获取评论异常:', err)
      setError(`获取评论异常: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 添加评论
  const addComment = async () => {
    if (!newComment.trim() || !user || !isAuthenticated) {
      setError('请输入评论内容且确保已登录')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      console.log('📝 添加评论:', newComment.trim())
      
      const { data, error } = await supabase
        .from('comments')
        .insert({
          requirement_id: requirementId,
          content: newComment.trim(),
          user_id: user.id
        })
        .select()

      if (error) {
        console.error('❌ 添加评论失败:', error)
        setError(`添加评论失败: ${error.message}`)
        return
      }

      console.log('✅ 评论添加成功:', data)
      setNewComment('')
      
      // 重新获取评论列表
      await fetchComments()
      
    } catch (err: any) {
      console.error('❌ 添加评论异常:', err)
      setError(`添加评论异常: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  // 初始加载评论
  useEffect(() => {
    if (!authLoading) {
      fetchComments()
    }
  }, [requirementId, authLoading])

  // 认证状态检查
  if (authLoading) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg">
        <div className="text-blue-800">正在检查登录状态...</div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="text-yellow-800">
          <strong>需要登录</strong>
          <p className="mt-1 text-sm">请先登录后再查看和添加评论</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 用户信息显示 */}
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="text-green-800">
          <strong>当前用户:</strong> {user.name} ({user.rolename || '未知角色'})
        </div>
        <div className="text-sm text-green-600 mt-1">
          邮箱: {user.email} | 角色ID: {user.role_id} | 用户ID: {user.id}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-red-800">
            <strong>错误:</strong> {error}
          </div>
        </div>
      )}

      {/* 添加评论 */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">添加评论</h3>
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="请输入您的评论..."
          className="w-full p-3 border border-gray-300 rounded-lg resize-none"
          rows={3}
          disabled={submitting}
        />
        <div className="mt-3 flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {newComment.length}/500 字符
          </span>
          <button
            onClick={addComment}
            disabled={submitting || !newComment.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '提交中...' : '发表评论'}
          </button>
        </div>
      </div>

      {/* 评论列表 */}
      <div className="border border-gray-200 rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            评论列表 ({comments.length})
            <button
              onClick={fetchComments}
              disabled={loading}
              className="ml-3 text-sm px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              {loading ? '刷新中...' : '🔄 刷新'}
            </button>
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              正在加载评论...
            </div>
          ) : comments.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              暂无评论，来发表第一条评论吧！
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-gray-900">
                    {comment.user_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(comment.created_at).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div className="text-gray-700 whitespace-pre-wrap">
                  {comment.content}
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  用户ID: {comment.user_id}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}