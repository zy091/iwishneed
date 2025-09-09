import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Trash2, Send, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { toast } from '@/hooks/use-toast'
import type { Comment } from '@/services/comments-service'
import { 
  getComments, 
  addComment, 
  deleteComment, 
  canAddComment 
} from '@/services/comments-service'

interface RealtimeCommentsProps {
  requirementId: string
  className?: string
}

export default function RealtimeComments({ requirementId, className }: RealtimeCommentsProps) {
  const { user } = useAuth()
  const { canDeleteAnyComments } = usePermissions()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [canComment, setCanComment] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  // 滚动到最新评�?
  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // 加载评论
  const loadComments = async () => {
    try {
      const data = await getComments(requirementId)
      setComments(data)
    } catch (error) {
      console.error('加载评论失败:', error)
      toast({
        title: '加载评论失败',
        description: '请刷新页面重�?,
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 检查评论权�?
  const checkCommentPermission = async () => {
    try {
      const canAdd = await canAddComment()
      setCanComment(canAdd)
    } catch (error) {
      console.error('检查评论权限失�?', error)
      setCanComment(false)
    }
  }

  // 提交评论
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const comment = await addComment({
        requirement_id: requirementId,
        content: newComment.trim()
      })
      
      // 乐观更新：立即添加到列表
      setComments(prev => [comment, ...prev])
      setNewComment('')
      
      toast({
        title: '评论已发�?,
        description: '您的评论已成功添�?
      })
      
      // 滚动到最新评�?
      setTimeout(scrollToBottom, 100)
    } catch (error) {
      console.error('发布评论失败:', error)
      toast({
        title: '发布评论失败',
        description: error instanceof Error ? error.message : '请稍后重�?,
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 删除评论
  const handleDelete = async (commentId: string) => {
    if (!confirm('确定要删除这条评论吗�?)) return

    try {
      await deleteComment(commentId)
      
      // 乐观更新：立即从列表移除
      setComments(prev => prev.filter(c => c.id !== commentId))
      
      toast({
        title: '评论已删�?,
        description: '评论删除成功'
      })
    } catch (error) {
      console.error('删除评论失败:', error)
      toast({
        title: '删除评论失败',
        description: error instanceof Error ? error.message : '请稍后重�?,
        variant: 'destructive'
      })
    }
  }

  // 初始�?
  useEffect(() => {
    loadComments()
    checkCommentPermission()
  }, [requirementId])

  // 设置实时订阅
  useEffect(() => {
    const channel = supabase
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
          // 避免重复添加自己的评�?
          setComments(prev => {
            const exists = prev.some(c => c.id === newComment.id)
            if (exists) return prev
            return [newComment, ...prev]
          })
          
          // 如果不是当前用户的评论，显示通知
          if (newComment.user_external_id !== user?.id) {
            toast({
              title: '新评�?,
              description: `${newComment.user_email_masked} 发表了新评论`
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: `requirement_id=eq.${requirementId}`
        },
        (payload) => {
          const deletedComment = payload.old as Comment
          setComments(prev => prev.filter(c => c.id !== deletedComment.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [requirementId, user?.id])

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">加载评论�?..</span>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 评论输入�?*/}
      {canComment && (
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                placeholder="写下您的评论..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[100px] resize-none"
                disabled={isSubmitting}
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {newComment.length}/1000 字符
                </span>
                <Button 
                  type="submit" 
                  disabled={!newComment.trim() || isSubmitting}
                  size="sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      发布�?..
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      发布评论
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 评论列表 */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <p>暂无评论</p>
                {canComment && <p className="text-sm mt-1">成为第一个评论的人吧�?/p>}
              </div>
            </CardContent>
          </Card>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {comment.user_email_masked.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">
                          {comment.user_email_masked}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                            locale: zhCN
                          })}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* 删除按钮 */}
                  {(canDeleteAnyComments || comment.user_external_id === user?.id) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(comment.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm whitespace-pre-wrap break-words">
                  {comment.content}
                </p>
                
                {/* 附件显示 */}
                {comment.attachments && comment.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">附件:</p>
                    {comment.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          {attachment.file_name}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
      
      {/* 滚动锚点 */}
      <div ref={commentsEndRef} />
    </div>
  )
}
