import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { 
  getComments, 
  addComment, 
  deleteComment, 
  canAddComment,
  type Comment,
  type AddCommentParams 
} from '@/services/comments-service'
import { useAuth } from '@/hooks/useAuth'
import { logger } from '@/lib/logger'
import { 
  MessageCircle, 
  Reply, 
  Trash2, 
  Paperclip, 
  Send,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface RequirementCommentsProps {
  requirementId: string
  requirementTitle?: string
  className?: string
}

interface CommentItemProps {
  comment: Comment
  onReply: (parentId: string) => void
  onDelete: (commentId: string) => void
  canDelete: boolean
  level?: number
}

const CommentItem: React.FC<CommentItemProps> = ({ 
  comment, 
  onReply, 
  onDelete, 
  canDelete,
  level = 0 
}) => {
  const [showReplies, setShowReplies] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('确定要删除这条评论吗�?)) return
    
    setIsDeleting(true)
    try {
      await onDelete(comment.id)
    } finally {
      setIsDeleting(false)
    }
  }

  const getInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase()
  }

  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
    locale: zhCN
  })

  return (
    <div className={`${level > 0 ? 'ml-8 mt-4' : 'mt-4'}`}>
      <div className="flex space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src="" />
          <AvatarFallback className="text-xs">
            {getInitials(comment.user_email_masked)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900">
              {comment.user_email_masked}
            </span>
            <span className="text-xs text-gray-500">{timeAgo}</span>
            {comment.attachments_count > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Paperclip className="h-3 w-3 mr-1" />
                {comment.attachments_count} 个附�?
              </Badge>
            )}
          </div>
          
          <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
            {comment.content}
          </div>
          
          {comment.attachments && comment.attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {comment.attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center space-x-2 text-xs text-blue-600">
                  <Paperclip className="h-3 w-3" />
                  <span>{attachment.file_name}</span>
                  <span className="text-gray-500">
                    ({(attachment.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-2 flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply(comment.id)}
              className="text-xs h-6 px-2"
            >
              <Reply className="h-3 w-3 mr-1" />
              回复
            </Button>
            
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-xs h-6 px-2 text-red-600 hover:text-red-700"
              >
                {isDeleting ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3 mr-1" />
                )}
                删除
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const RequirementComments: React.FC<RequirementCommentsProps> = ({
  requirementId,
  requirementTitle,
  className = ''
}) => {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [canComment, setCanComment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { user, isAdmin } = useAuth()
  const { toast } = useToast()

  // 加载评论
  const loadComments = async () => {
    try {
      setError(null)
      const data = await getComments(requirementId)
      setComments(data)
    } catch (err: any) {
      logger.error('获取评论失败', { error: err, requirementId })
      setError('获取评论失败，请稍后再试')
      toast({
        title: '获取评论失败',
        description: err.message || '请稍后再�?,
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
    } catch (err) {
      logger.warn('检查评论权限失�?, { error: err })
      setCanComment(false)
    }
  }

  useEffect(() => {
    loadComments()
    checkCommentPermission()
  }, [requirementId])

  // 添加评论
  const handleAddComment = async () => {
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      const params: AddCommentParams = {
        requirement_id: requirementId,
        content: newComment.trim()
      }

      await addComment(params)
      setNewComment('')
      await loadComments()
      
      toast({
        title: '评论添加成功',
        description: '您的评论已成功发�?
      })
    } catch (err: any) {
      logger.error('添加评论失败', { error: err, requirementId })
      toast({
        title: '添加评论失败',
        description: err.message || '请稍后再�?,
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 添加回复
  const handleAddReply = async () => {
    if (!replyContent.trim() || !replyTo) return

    setIsSubmitting(true)
    try {
      const params: AddCommentParams = {
        requirement_id: requirementId,
        content: replyContent.trim(),
        parent_id: replyTo
      }

      await addComment(params)
      setReplyContent('')
      setReplyTo(null)
      await loadComments()
      
      toast({
        title: '回复添加成功',
        description: '您的回复已成功发�?
      })
    } catch (err: any) {
      logger.error('添加回复失败', { error: err, requirementId })
      toast({
        title: '添加回复失败',
        description: err.message || '请稍后再�?,
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 删除评论
  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId)
      await loadComments()
      
      toast({
        title: '评论删除成功',
        description: '评论已成功删�?
      })
    } catch (err: any) {
      logger.error('删除评论失败', { error: err, commentId })
      toast({
        title: '删除评论失败',
        description: err.message || '请稍后再�?,
        variant: 'destructive'
      })
    }
  }

  // 开始回�?
  const handleStartReply = (parentId: string) => {
    setReplyTo(parentId)
    setReplyContent('')
  }

  // 取消回复
  const handleCancelReply = () => {
    setReplyTo(null)
    setReplyContent('')
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>加载评论�?..</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5" />
          <span>评论 ({comments.length})</span>
        </CardTitle>
        {requirementTitle && (
          <p className="text-sm text-gray-600">针对需�? {requirementTitle}</p>
        )}
      </CardHeader>
      
      <CardContent className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* 添加评论 */}
        {canComment && (
          <div className="mb-6">
            <Textarea
              placeholder="添加评论..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="mb-3"
              rows={3}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleAddComment}
                disabled={!newComment.trim() || isSubmitting}
                size="sm"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                发布评论
              </Button>
            </div>
          </div>
        )}

        {!canComment && user && (
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-700">您暂时没有评论权�?/p>
          </div>
        )}

        {!user && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">请登录后参与评论</p>
          </div>
        )}

        <Separator className="mb-4" />

        {/* 评论列表 */}
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>暂无评论，来发表第一条评论吧�?/p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id}>
                <CommentItem
                  comment={comment}
                  onReply={handleStartReply}
                  onDelete={handleDeleteComment}
                  canDelete={isAdmin || comment.user_external_id === user?.id}
                />
                
                {/* 回复�?*/}
                {replyTo === comment.id && (
                  <div className="ml-11 mt-3 p-3 bg-gray-50 rounded-md">
                    <Textarea
                      placeholder="输入回复内容..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="mb-3"
                      rows={2}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelReply}
                      >
                        取消
                      </Button>
                      <Button
                        onClick={handleAddReply}
                        disabled={!replyContent.trim() || isSubmitting}
                        size="sm"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Reply className="h-4 w-4 mr-2" />
                        )}
                        回复
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RequirementComments
