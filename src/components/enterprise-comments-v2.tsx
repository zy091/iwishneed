import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { EnterpriseAuthService, UserPermissions } from '@/services/enterprise-auth-service'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  MessageCircle, 
  Send, 
  Trash2, 
  Edit3, 
  Reply, 
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

interface Comment {
  id: string
  requirement_id: string
  content: string
  parent_id?: string
  user_id: string
  user_external_id: string
  user_email: string
  created_at: string
  updated_at: string
  user_name?: string
  user_role?: string
  replies?: Comment[]
}

interface EnterpriseCommentsV2Props {
  requirementId: string
  className?: string
}

export default function EnterpriseCommentsV2({ 
  requirementId, 
  className = '' 
}: EnterpriseCommentsV2Props) {
  const { toast } = useToast()
  
  // 状态管理
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  
  // 引用
  const commentsEndRef = useRef<HTMLDivElement>(null)

  // 初始化组件 - 并行获取权限和评论
  const initializeComponent = async () => {
    try {
      setLoading(true)
      setAuthLoading(true)
      
      // 并行获取用户权限和评论数据
      const [permissions, commentsData] = await Promise.all([
        EnterpriseAuthService.getCurrentUserPermissions(),
        fetchComments()
      ])
      
      setUserPermissions(permissions)
      setComments(commentsData)
      
      console.log('组件初始化完成:', {
        hasPermissions: !!permissions,
        userRole: permissions?.roleName,
        commentsCount: commentsData.length
      })
      
    } catch (error) {
      console.error('组件初始化失败:', error)
      toast({
        title: '初始化失败',
        description: '请刷新页面重试',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
      setAuthLoading(false)
    }
  }

  // 获取评论数据
  const fetchComments = async (): Promise<Comment[]> => {
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (
            name,
            role_id
          )
        `)
        .eq('requirement_id', requirementId)
        .order('created_at', { ascending: true })

      if (commentsError) throw commentsError

      // 处理评论数据
      const processedComments = (commentsData || []).map(comment => ({
        ...comment,
        user_name: comment.profiles?.name || comment.user_email || '未知用户',
        user_role: getRoleName(comment.profiles?.role_id)
      }))

      // 构建评论树结构
      return buildCommentTree(processedComments)
      
    } catch (error) {
      console.error('获取评论失败:', error)
      throw error
    }
  }

  // 构建评论树
  const buildCommentTree = (comments: Comment[]): Comment[] => {
    const commentMap = new Map<string, Comment>()
    const rootComments: Comment[] = []

    // 创建评论映射
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] })
    })

    // 构建树结构
    comments.forEach(comment => {
      const commentNode = commentMap.get(comment.id)!
      
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id)
        if (parent) {
          parent.replies = parent.replies || []
          parent.replies.push(commentNode)
        }
      } else {
        rootComments.push(commentNode)
      }
    })

    return rootComments
  }

  // 获取角色名称
  const getRoleName = (roleId?: number): string => {
    switch (roleId) {
      case 0: return '超级管理员'
      case 1: return '管理员'
      case 2: return '经理'
      case 3: return '开发者'
      default: return '提交者'
    }
  }

  // 提交评论 - 基于数据库验证
  const handleSubmitComment = async () => {
    if (!newComment.trim()) return

    try {
      setSubmitting(true)
      
      // 实时权限验证
      const canComment = await EnterpriseAuthService.canPerformAction('comment_create')
      if (!canComment) {
        throw new Error('您没有评论权限，请刷新页面重试')
      }

      // 提交评论 - 用户信息由数据库触发器自动设置
      const { data, error } = await supabase
        .from('comments')
        .insert({
          requirement_id: requirementId,
          content: newComment.trim(),
          parent_id: replyTo
        })
        .select(`
          *,
          profiles:user_id (
            name,
            role_id
          )
        `)
        .single()

      if (error) throw error

      // 处理新评论数据
      const newCommentWithProfile = {
        ...data,
        user_name: data.profiles?.name || userPermissions?.name || '当前用户',
        user_role: getRoleName(data.profiles?.role_id || userPermissions?.roleId),
        replies: []
      }

      // 乐观更新
      if (replyTo) {
        setComments(prev => addReplyToTree(prev, replyTo, newCommentWithProfile))
      } else {
        setComments(prev => [...prev, newCommentWithProfile])
      }

      setNewComment('')
      setReplyTo(null)
      
      toast({
        title: '评论发布成功',
        description: '您的评论已成功发布',
      })

      // 滚动到底部
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)

    } catch (error) {
      console.error('发布评论失败:', error)
      toast({
        title: '发布评论失败',
        description: error instanceof Error ? error.message : '请检查网络连接后重试',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  // 添加回复到评论树
  const addReplyToTree = (comments: Comment[], parentId: string, reply: Comment): Comment[] => {
    return comments.map(comment => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), reply]
        }
      }
      if (comment.replies) {
        return {
          ...comment,
          replies: addReplyToTree(comment.replies, parentId, reply)
        }
      }
      return comment
    })
  }

  // 删除评论 - 基于数据库验证
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('确定要删除这条评论吗？')) return

    try {
      // 实时权限验证
      const canDelete = await EnterpriseAuthService.canPerformAction('comment_delete', commentId)
      if (!canDelete) {
        throw new Error('您没有删除权限')
      }

      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      // 从状态中移除评论
      setComments(prev => removeCommentFromTree(prev, commentId))
      
      toast({
        title: '评论已删除',
        description: '评论删除成功',
      })

    } catch (error) {
      console.error('删除评论失败:', error)
      toast({
        title: '删除失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive'
      })
    }
  }

  // 从评论树中移除评论
  const removeCommentFromTree = (comments: Comment[], commentId: string): Comment[] => {
    return comments
      .filter(comment => comment.id !== commentId)
      .map(comment => ({
        ...comment,
        replies: comment.replies ? removeCommentFromTree(comment.replies, commentId) : []
      }))
  }

  // 编辑评论 - 基于数据库验证
  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return

    try {
      // 实时权限验证
      const canEdit = await EnterpriseAuthService.canPerformAction('comment_edit', commentId)
      if (!canEdit) {
        throw new Error('您没有编辑权限')
      }

      const { error } = await supabase
        .from('comments')
        .update({ 
          content: editContent.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', commentId)

      if (error) throw error

      // 更新状态
      setComments(prev => updateCommentInTree(prev, commentId, editContent.trim()))
      setEditingComment(null)
      setEditContent('')
      
      toast({
        title: '评论已更新',
        description: '评论修改成功',
      })

    } catch (error) {
      console.error('编辑评论失败:', error)
      toast({
        title: '编辑失败',
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: 'destructive'
      })
    }
  }

  // 在评论树中更新评论
  const updateCommentInTree = (comments: Comment[], commentId: string, newContent: string): Comment[] => {
    return comments.map(comment => {
      if (comment.id === commentId) {
        return { ...comment, content: newContent, updated_at: new Date().toISOString() }
      }
      if (comment.replies) {
        return {
          ...comment,
          replies: updateCommentInTree(comment.replies, commentId, newContent)
        }
      }
      return comment
    })
  }

  // 权限检查函数
  const canEditComment = (comment: Comment): boolean => {
    return userPermissions?.userId === comment.user_id
  }

  const canDeleteComment = (comment: Comment): boolean => {
    return userPermissions?.isAdmin || userPermissions?.userId === comment.user_id
  }

  // 刷新权限和评论
  const handleRefresh = async () => {
    await initializeComponent()
  }

  // 渲染单个评论
  const renderComment = (comment: Comment, depth = 0) => {
    const isEditing = editingComment === comment.id
    const maxDepth = 3

    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-8 mt-4' : 'mb-6'}`}>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${comment.user_name}`} />
                <AvatarFallback>
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-medium text-sm">{comment.user_name}</span>
                  {comment.user_role && (
                    <Badge variant="secondary" className="text-xs">
                      {comment.user_role}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { 
                      addSuffix: true, 
                      locale: zhCN 
                    })}
                  </span>
                  {comment.updated_at !== comment.created_at && (
                    <Badge variant="outline" className="text-xs">
                      已编辑
                    </Badge>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="编辑评论..."
                      className="min-h-[80px]"
                    />
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleEditComment(comment.id)}
                        disabled={!editContent.trim()}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        保存
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setEditingComment(null)
                          setEditContent('')
                        }}
                      >
                        取消
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap mb-3">
                      {comment.content}
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center space-x-2">
                      {userPermissions && depth < maxDepth && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setReplyTo(comment.id)}
                          className="h-7 px-2 text-xs"
                        >
                          <Reply className="w-3 h-3 mr-1" />
                          回复
                        </Button>
                      )}
                      
                      {canEditComment(comment) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingComment(comment.id)
                            setEditContent(comment.content)
                          }}
                          className="h-7 px-2 text-xs"
                        >
                          <Edit3 className="w-3 h-3 mr-1" />
                          编辑
                        </Button>
                      )}
                      
                      {canDeleteComment(comment) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          删除
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 回复表单 */}
        {replyTo === comment.id && userPermissions && (
          <div className="mt-4 ml-8">
            <Card className="border-blue-200">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-2">
                  回复 @{comment.user_name}
                </div>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="写下您的回复..."
                  className="min-h-[80px] mb-3"
                />
                <div className="flex space-x-2">
                  <Button 
                    size="sm"
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submitting}
                  >
                    {submitting ? (
                      <Clock className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-1" />
                    )}
                    发布回复
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setReplyTo(null)
                      setNewComment('')
                    }}
                  >
                    取消
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 递归渲染回复 */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4">
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  // 组件初始化
  useEffect(() => {
    initializeComponent()

    // 订阅实时更新
    const subscription = supabase
      .channel(`comments:${requirementId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `requirement_id=eq.${requirementId}`
        },
        (payload) => {
          console.log('评论实时更新:', payload)
          // 重新获取评论以保持数据一致性
          fetchComments().then(setComments).catch(console.error)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [requirementId])

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageCircle className="w-5 h-5 mr-2" />
            评论讨论
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Clock className="w-6 h-6 animate-spin mr-2" />
            <span>加载评论中...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <MessageCircle className="w-5 h-5 mr-2" />
            评论讨论
            <Badge variant="secondary" className="ml-2">
              {comments.length} 条评论
            </Badge>
          </div>
          <Button size="sm" variant="outline" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-1" />
            刷新
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 认证状态显示 */}
        {authLoading ? (
          <Card className="border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center text-blue-600">
                <Clock className="w-5 h-5 mr-2 animate-spin" />
                <span>正在验证用户权限...</span>
              </div>
            </CardContent>
          </Card>
        ) : userPermissions ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-green-800">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span>已登录：{userPermissions.name}</span>
                  <Badge variant="secondary" className="ml-2">
                    {userPermissions.roleName}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center text-yellow-800">
                <AlertCircle className="w-5 h-5 mr-2" />
                <span>请登录后参与评论讨论</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 新评论表单 */}
        {userPermissions && (
          <Card className="border-green-200">
            <CardContent className="p-4">
              <div className="space-y-3">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="写下您的评论..."
                  className="min-h-[100px]"
                />
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    以 {userPermissions.name} ({userPermissions.roleName}) 身份发布
                  </div>
                  
                  <Button 
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submitting}
                  >
                    {submitting ? (
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    发布评论
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 评论列表 */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <Card className="border-gray-200">
              <CardContent className="p-8 text-center">
                <MessageCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">暂无评论，来发表第一条评论吧！</p>
              </CardContent>
            </Card>
          ) : (
            comments.map(comment => renderComment(comment))
          )}
        </div>

        <div ref={commentsEndRef} />
      </CardContent>
    </Card>
  )
}