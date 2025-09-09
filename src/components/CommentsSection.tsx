import React, { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Send, Reply, Trash2, Paperclip, Download, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'
import { useToast } from '@/hooks/use-toast'
import {
  Comment,
  getComments,
  addComment,
  deleteComment,
  presignUploads,
  uploadToSignedUrls,
  getAttachmentSignedUrl
} from '@/services/comments-service'

// 权限检查 hook
import { usePermissions } from '@/hooks/use-permissions'

interface CommentsSectionProps {
  requirementId: string
  className?: string
}

// 文件大小限制
const IMAGE_MAX_MB = 5
const FILE_MAX_MB = 10
const MAX_ATTACH = 5

// 格式化文件大小
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export default function CommentsSection({ requirementId, className = '' }: CommentsSectionProps) {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const { canComment, canDelete } = usePermissions()

  // 状态管理
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({})
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [replySubmitting, setReplySubmitting] = useState<Record<string, boolean>>({})

  // 加载评论
  const loadComments = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getComments(requirementId)
      setComments(data)
    } catch (err: any) {
      console.error('加载评论失败:', err)
      setError(err.message || '加载评论失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadComments()
  }, [requirementId])

  // 实时订阅评论更新
  useEffect(() => {
    const channel = supabase
      .channel(`comments:${requirementId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `requirement_id=eq.${requirementId}`
      }, (payload) => {
        if (import.meta.env.DEV) {
          console.log('评论实时更新:', payload)
        }
        loadComments()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [requirementId])

  // 构建评论树结构
  const commentTree = useMemo(() => {
    const tree: Array<Comment & { children: Comment[] }> = []
    const childMap: Record<string, Comment[]> = {}

    // 分离父评论和子评论
    comments.forEach(comment => {
      if (comment.parent_id) {
        if (!childMap[comment.parent_id]) {
          childMap[comment.parent_id] = []
        }
        childMap[comment.parent_id].push(comment)
      } else {
        tree.push({ ...comment, children: [] })
      }
    })

    // 为每个父评论添加子评论
    tree.forEach(parent => {
      parent.children = childMap[parent.id] || []
      // 按时间升序排列子评论
      parent.children.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    })

    // 按时间降序排列父评论
    return tree.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [comments])

  // 获取用户显示名称
  const getUserDisplayName = (comment: Comment) => {
    if (comment.user_id && profile?.id === comment.user_id) {
      return profile.name || profile.full_name || '我'
    }
    return comment.user_email?.split('@')[0] || '匿名用户'
  }

  // 获取用户头像
  const getUserAvatar = (comment: Comment) => {
    const name = getUserDisplayName(comment)
    return name.charAt(0).toUpperCase()
  }

  // 处理文件选择
  const handleFilesPick = (fileList: FileList | null) => {
    if (!fileList) return

    const files = Array.from(fileList)
    const errors: string[] = []
    const next: File[] = [...attachments]

    for (const f of files) {
      if (next.length >= MAX_ATTACH) {
        errors.push(`最多只能上传 ${MAX_ATTACH} 个附件`)
        break
      }

      const isImage = f.type.startsWith('image/')
      const maxSize = isImage ? IMAGE_MAX_MB : FILE_MAX_MB
      const maxBytes = maxSize * 1024 * 1024

      if (f.size > maxBytes) {
        errors.push(`${f.name} 超过 ${maxSize}MB`)
        continue
      }
      next.push(f)
    }
    setAttachments(next)
    if (errors.length) {
      toast({ title: '附件校验', description: errors.join('，'), variant: 'destructive' })
    }
  }

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx))
  }

  // 提交评论
  const handleSubmitComment = async () => {
    if (!newComment.trim() && !attachments.length) return
    if (!user) {
      toast({ title: '请先登录', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      setError(null)

      // 准备附件元数据
      const filesMeta = attachments.map(f => ({
        file_name: f.name,
        size: f.size,
        mime_type: f.type
      }))

      // 获取预签名上传URL
      const presigned = await presignUploads(requirementId, filesMeta)

      // 上传文件
      const items = presigned.map(u => ({ path: u.path, token: u.token }))
      await uploadToSignedUrls(items, attachments)

      // 添加评论
      const added = await addComment({
        requirement_id: requirementId,
        content: newComment.trim(),
        user_external_id: user.id,
        user_email: user.email || '',
        attachments: presigned.map(u => ({
          file_name: u.file_name,
          size: u.size,
          mime_type: u.mime_type,
          path: u.path
        }))
      })

      // 更新本地状态
      const merged: Comment = { ...added, attachments: presigned }
      setComments(prev => [merged, ...prev])
      setNewComment('')
      setAttachments([])

      toast({ title: '评论提交成功' })
    } catch (err: any) {
      console.error('提交评论失败:', err)
      toast({ title: '提交评论失败', description: err.message || '请稍后再试', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 提交回复
  const handleSubmitReply = async (parentId: string) => {
    const content = replyText[parentId]?.trim()
    if (!content || !user) return

    setReplySubmitting(prev => ({ ...prev, [parentId]: true }))
    try {
      setError(null)
      const added = await addComment({
        requirement_id: requirementId,
        content,
        user_external_id: user.id,
        user_email: user.email || '',
        parent_id: parentId,
        attachments: []
      })
      const merged: Comment = { ...added, attachments: [] }
      setComments(prev => [merged, ...prev])
      setReplyOpen(prev => ({ ...prev, [parentId]: false }))
      setReplyText(prev => ({ ...prev, [parentId]: '' }))
    } catch (err: any) {
      console.error('提交回复失败:', err)
      toast({ title: '提交回复失败', description: err.message || '请稍后再试', variant: 'destructive' })
    } finally {
      setReplySubmitting(prev => ({ ...prev, [parentId]: false }))
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      setError(null)
      const ok = await deleteComment(commentId)
      if (ok) {
        setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId))
        toast({ title: '评论删除成功' })
      }
    } catch (err: any) {
      console.error('删除评论失败:', err)
      toast({ title: '删除评论失败', description: err.message || '请稍后再试', variant: 'destructive' })
    }
  }

  // 按父评论分组子评论
  const childrenByParent = useMemo(() => {
    return comments.reduce((acc, comment) => {
      if (comment.parent_id) {
        if (!acc[comment.parent_id]) acc[comment.parent_id] = []
        acc[comment.parent_id].push(comment)
      }
      return acc
    }, {} as Record<string, Comment[]>)
  }, [comments])

  const openAttachment = async (path: string) => {
    try {
      const url = await getAttachmentSignedUrl(path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e: any) {
      toast({ title: '无法打开附件', description: e.message || '请稍后再试', variant: 'destructive' })
    }
  }

  // 图片附件组件
  const AttachmentImage = ({ attachment, onError }: { 
    attachment: NonNullable<Comment['attachments']>[0], 
    onError?: () => void 
  }) => {
    const [imageUrl, setImageUrl] = useState<string>('')
    const [imageLoading, setImageLoading] = useState(true)

    useEffect(() => {
      const loadImage = async () => {
        try {
          const url = await getAttachmentSignedUrl(attachment.path)
          setImageUrl(url)
        } catch (error) {
          if (onError) onError()
        } finally {
          setImageLoading(false)
        }
      }
      loadImage()
    }, [attachment.path, onError])

    if (imageLoading) {
      return <div className="w-full h-32 bg-gray-200 animate-pulse rounded"></div>
    }

    if (!imageUrl) {
      return <div className="w-full h-32 bg-gray-100 flex items-center justify-center rounded">加载失败</div>
    }

    return (
      <div className="relative group cursor-pointer" onClick={() => openAttachment(attachment.path)}>
        <img
          src={imageUrl}
          alt={attachment.file_name}
          className="w-full h-auto max-h-64 object-cover rounded"
          onError={() => {
            if (import.meta.env.DEV) {
              console.log('图片加载失败:', attachment.file_name)
            }
            if (onError) onError()
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-sm truncate">{attachment.file_name}</p>
          <p className="text-xs text-gray-300">点击查看大图 · {formatBytes(attachment.size)}</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className={`p-4 ${className}`}>加载评论中...</div>
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <p className="text-red-600">加载评论失败: {error}</p>
        <Button onClick={loadComments} className="mt-2">重试</Button>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold">评论 ({comments.filter(c => !c.parent_id).length})</h3>

      {/* 添加评论表单 */}
      {canComment && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <Textarea
                placeholder="添加评论（最多1000字，默认匿名对所有人可见）"
                value={newComment}
                onChange={(e) => {
                  const v = e.target.value
                  if (v.length <= 1000) setNewComment(v)
                }}
                className="min-h-[100px]"
              />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center">
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,application/x-zip-compressed"
                      className="hidden"
                      onChange={(e) => handleFilesPick(e.target.files)}
                    />
                    <Button type="button" variant="outline" className="cursor-pointer" asChild>
                      <span>
                        <Paperclip className="mr-2 h-4 w-4" />
                        添加附件
                      </span>
                    </Button>
                  </label>
                  <span className="text-xs text-gray-500">
                    最多{MAX_ATTACH}个；图片≤{IMAGE_MAX_MB}MB；文档≤{FILE_MAX_MB}MB
                  </span>
                </div>
                <Button onClick={handleSubmitComment} disabled={isSubmitting || (!newComment.trim() && !attachments.length)}>
                  <Send className="mr-2 h-4 w-4" />
                  {isSubmitting ? '提交中...' : '提交评论'}
                </Button>
              </div>

              {/* 附件预览 */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((file, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                      {file.name}
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        className="ml-1 text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 评论列表 */}
      <div className="space-y-4">
        {commentTree.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暂无评论</p>
        ) : (
          commentTree.map((comment) => {
            const child = childrenByParent[comment.id] || []
            return (
              <Card key={comment.id}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-sm">
                        {getUserAvatar(comment)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm">{getUserDisplayName(comment)}</span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(comment.created_at), 'PPpp', { locale: zhCN })}
                        </span>
                      </div>
                      <div className="text-sm text-gray-900 whitespace-pre-wrap mb-3">
                        {comment.content}
                      </div>

                      {/* 附件显示 */}
                      {comment.attachments && comment.attachments.length > 0 && (
                        <div className="mb-3 space-y-2">
                          {comment.attachments.map((att, idx) => (
                            <div key={idx} className="border rounded-lg overflow-hidden">
                              {att.mime_type?.startsWith('image/') ? (
                                <AttachmentImage
                                  attachment={att}
                                  onError={() => {
                                    if (import.meta.env.DEV) {
                                      console.log('图片加载失败:', att.file_name)
                                    }
                                  }}
                                />
                              ) : (
                                <div className="p-3 flex items-center space-x-3">
                                  <div className="flex-shrink-0">
                                    <Download className="h-5 w-5 text-gray-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {att.file_name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formatBytes(att.size)}
                                      {att.mime_type && ` · ${att.mime_type}`}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openAttachment(att.path)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2">
                        {canComment && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReplyOpen(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                          >
                            <Reply className="h-4 w-4 mr-1" />
                            回复
                          </Button>
                        )}
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4 mr-1" />
                                删除
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>确认删除</AlertDialogTitle>
                                <AlertDialogDescription>
                                  删除该评论将同时删除其一级回复与附件，此操作无法撤销。
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

                      {/* 回复表单 */}
                      {replyOpen[comment.id] && (
                        <div className="mt-3 pl-4 border-l-2 border-gray-200">
                          <div className="space-y-2">
                            <Textarea
                              placeholder="回复（一级楼中楼，最多1000字，默认匿名）"
                              value={replyText[comment.id] || ''}
                              onChange={(e) => {
                                const v = e.target.value
                                if (v.length <= 1000) {
                                  setReplyText(prev => ({ ...prev, [comment.id]: v }))
                                }
                              }}
                              className="min-h-[80px]"
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReplyOpen(prev => ({ ...prev, [comment.id]: false }))}
                              >
                                取消
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSubmitReply(comment.id)}
                                disabled={replySubmitting[comment.id] || !replyText[comment.id]?.trim()}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                {replySubmitting[comment.id] ? '提交中...' : '提交回复'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 子回复列表 */}
                      {child.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-gray-100 space-y-3">
                          {child.map((reply) => (
                            <div key={reply.id} className="flex items-start space-x-2">
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-xs">
                                  {getUserAvatar(reply)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-xs">{getUserDisplayName(reply)}</span>
                                  <span className="text-xs text-gray-400">
                                    {format(new Date(reply.created_at), 'PPpp', { locale: zhCN })}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-700 whitespace-pre-wrap">
                                  {reply.content}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}