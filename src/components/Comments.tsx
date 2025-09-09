import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase, Comment } from '../lib/supabaseClient'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Card, CardContent, CardHeader } from './ui/card'
import { Avatar, AvatarFallback } from './ui/avatar'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Loader2, Send } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert'

interface CommentsProps {
  requirementId: string
}

export function Comments({ requirementId }: CommentsProps) {
  const { user, profile } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取评论列表
  const fetchComments = async () => {
    try {
      setError(null)
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('requirement_id', requirementId)
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      setComments(data || [])
    } catch (err) {
      console.error('获取评论失败:', err)
      setError(err instanceof Error ? err.message : '获取评论失败')
    } finally {
      setLoading(false)
    }
  }

  // 提交评论
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newComment.trim() || !user || !profile) {
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const commentData = {
        requirement_id: requirementId,
        content: newComment.trim(),
        user_external_id: user.id,
        user_email: user.email || '',
        user_id: user.id
      }

      const { data, error } = await supabase
        .from('comments')
        .insert([commentData])
        .select()
        .single()

      if (error) {
        throw error
      }

      // 添加到本地状态（乐观更新）
      if (data) {
        setComments(prev => [...prev, data])
        setNewComment('')
      }
    } catch (err) {
      console.error('提交评论失败:', err)
      setError(err instanceof Error ? err.message : '提交评论失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 获取用户显示名称
  const getUserDisplayName = (comment: Comment) => {
    if (comment.user_email === user?.email) {
      return profile?.name || profile?.full_name || '我'
    }
    return comment.user_email.split('@')[0]
  }

  // 获取用户头像
  const getUserAvatar = (comment: Comment) => {
    const name = getUserDisplayName(comment)
    return name.charAt(0).toUpperCase()
  }

  useEffect(() => {
    fetchComments()

    // 实时订阅评论更新
    const subscription = supabase
      .channel(`comments:${requirementId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `requirement_id=eq.${requirementId}`
        },
        (payload) => {
          const newComment = payload.new as Comment
          setComments(prev => {
            // 避免重复添加
            if (prev.some(c => c.id === newComment.id)) {
              return prev
            }
            return [...prev, newComment]
          })
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [requirementId])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">加载评论中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">评论 ({comments.length})</h3>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 评论列表 */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center py-4">暂无评论</p>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getUserAvatar(comment)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{getUserDisplayName(comment)}</p>
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                        locale: zhCN
                      })}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 添加评论表单 */}
      {user && profile ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            placeholder="写下您的评论..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={submitting}
            rows={3}
          />
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              以 {profile.name || profile.full_name || '用户'} 身份评论
            </p>
            <Button 
              type="submit" 
              disabled={!newComment.trim() || submitting}
              size="sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  发送中...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  发送评论
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <Alert>
          <AlertDescription>请登录后发表评论</AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default Comments