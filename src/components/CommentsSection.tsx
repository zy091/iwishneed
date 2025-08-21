import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Trash2 } from 'lucide-react'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Comment, getComments, addComment, deleteComment, canAddComment } from '@/services/comments-service'

interface CommentsSectionProps {
  requirementId: string
}

export default function CommentsSection({ requirementId }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canComment = canAddComment()

  // 加载评论
  useEffect(() => {
    async function loadComments() {
      if (!requirementId) return
      
      try {
        setIsLoading(true)
        const data = await getComments(requirementId)
        setComments(data)
        setError(null)
      } catch (err) {
        console.error('获取评论失败:', err)
        setError('获取评论失败，请稍后再试')
      } finally {
        setIsLoading(false)
      }
    }

    loadComments()
  }, [requirementId])

  // 提交评论
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !requirementId) return
    
    try {
      setIsSubmitting(true)
      setError(null)
      
      const addedComment = await addComment({
        requirement_id: requirementId,
        content: newComment.trim()
      })
      
      // 添加到评论列表
      setComments(prev => [addedComment, ...prev])
      setNewComment('')
    } catch (err: any) {
      console.error('添加评论失败:', err)
      setError(err.message || '添加评论失败，请稍后再试')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 删除评论
  const handleDeleteComment = async (commentId: string) => {
    try {
      setError(null)
      const success = await deleteComment(commentId)
      
      if (success) {
        // 从列表中移除
        setComments(prev => prev.filter(comment => comment.id !== commentId))
      }
    } catch (err: any) {
      console.error('删除评论失败:', err)
      setError(err.message || '删除评论失败，请稍后再试')
    }
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // 判断是否是自己的评论（通过匿名ID前缀判断）
  const isOwnComment = (comment: Comment) => {
    // 这里的逻辑需要根据实际情况调整
    // 如果后端返回了特殊标记表示是当前用户的评论，可以在这里判断
    return false // 默认不允许删除，Edge Function 会根据 token 判断
  }

  return (
    <div className="space-y-4">
      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* 评论输入框 */}
      {canComment ? (
        <div className="space-y-2">
          <Textarea
            placeholder="添加评论..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[100px]"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
            >
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? '提交中...' : '提交评论'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
          您需要从主系统登录才能添加评论
        </div>
      )}

      {/* 评论列表 */}
      <div className="space-y-4 mt-6">
        <h3 className="text-lg font-medium">评论 ({comments.length})</h3>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{comment.user_email_masked}</div>
                    <div className="text-sm text-gray-500">{formatDate(comment.created_at)}</div>
                  </div>
                  
                  {isOwnComment(comment) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认删除</AlertDialogTitle>
                          <AlertDialogDescription>
                            您确定要删除这条评论吗？此操作无法撤销。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteComment(comment.id)}>
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                
                <div className="mt-2 whitespace-pre-wrap">{comment.content}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">暂无评论</div>
        )}
      </div>
    </div>
  )
}