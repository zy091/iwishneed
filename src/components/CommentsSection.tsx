import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Trash2, Paperclip, Reply, File as FileIcon, Image as ImageIcon } from 'lucide-react'
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
import {
  Comment,
  getComments,
  addComment,
  deleteComment,
  canAddComment,
  presignUploads,
  uploadToSignedUrls,
  getAttachmentSignedUrl,
} from '@/services/comments-service'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'

interface CommentsSectionProps {
  requirementId: string
}

const MAX_ATTACH = 3
const IMAGE_MAX_MB = 5
const FILE_MAX_MB = 10
const BUCKET = 'comments-attachments'

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/zip',
  'application/x-zip-compressed',
])

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function maskEmailForCompare(email?: string) {
  if (!email || !email.includes('@')) return '匿名用户'
  const [name, domain] = email.split('@')
  const first = name?.charAt(0) || ''
  return `${first}***@${domain}`
}

export default function CommentsSection({ requirementId }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canComment = canAddComment()
  const { user } = useAuth()
  const { toast } = useToast()

  // 回复状态（一级）
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({})
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [replySubmitting, setReplySubmitting] = useState<Record<string, boolean>>({})

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

  const handleFilesPick = (files: FileList | null) => {
    if (!files) return
    const next: File[] = [...attachments]
    const errors: string[] = []
    for (const f of Array.from(files)) {
      if (next.length >= MAX_ATTACH) {
        errors.push(`最多选择 ${MAX_ATTACH} 个附件`)
        break
      }
      const isImage = f.type.startsWith('image/')
      const sizeMB = f.size / (1024 * 1024)
      if (!ALLOWED_TYPES.has(f.type) && !isImage) {
        errors.push(`${f.name} 格式不支持`)
        continue
      }
      if (isImage && sizeMB > IMAGE_MAX_MB) {
        errors.push(`${f.name} 超过 ${IMAGE_MAX_MB}MB`)
        continue
      }
      if (!isImage && sizeMB > FILE_MAX_MB) {
        errors.push(`${f.name} 超过 ${FILE_MAX_MB}MB`)
        continue
      }
      next.push(f)
    }
    setAttachments(next)
    if (errors.length) {
      toast({ title: '附件校验', description: errors.join('；'), variant: 'destructive' })
    }
  }

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx))
  }

  const doUploadIfNeeded = async (): Promise<Array<{ path: string; name: string; type: string; size: number }>> => {
    if (attachments.length === 0) return []
    const filesMeta = attachments.map(f => ({ name: f.name, type: f.type, size: f.size }))
    const presigned = await presignUploads(requirementId, filesMeta)
    // uploadToSignedUrls 需要 [{ path, token }] 与 files 顺序一一对应
    const items = presigned.map(u => ({ path: u.path, token: u.token }))
    const uploaded = await uploadToSignedUrls(BUCKET, items, attachments)
    return uploaded
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !requirementId) return
    try {
      setIsSubmitting(true)
      setError(null)

      const uploaded = await doUploadIfNeeded()

      const added = await addComment({
        requirement_id: requirementId,
        content: newComment.trim(),
        attachments: uploaded,
      })

      // 立即在前端合并附件，避免等待再次拉取
      const merged: Comment = { ...added, attachments: uploaded as any }
      setComments(prev => [merged, ...prev])
      setNewComment('')
      setAttachments([])
    } catch (err: any) {
      console.error('添加评论失败:', err)
      setError(err.message || '添加评论失败，请稍后再试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitReply = async (parentId: string) => {
    const content = (replyText[parentId] || '').trim()
    if (!content) return
    try {
      setReplySubmitting(prev => ({ ...prev, [parentId]: true }))
      const added = await addComment({
        requirement_id: requirementId,
        content,
        parent_id: parentId,
        attachments: [], // 目前回复不带附件，如需支持可扩展
      })
      const merged: Comment = { ...added, attachments: [] }
      // 将回复插入到父评论之后（按时间降序，此处直接靠 parent_id 构造结构由渲染负责）
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
      }
    } catch (err: any) {
      console.error('删除评论失败:', err)
      setError(err.message || '删除评论失败，请稍后再试')
    }
  }

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

  const isAdmin = (user as any)?.role_id === 0
  const isOwnComment = (comment: Comment) => {
    const maskedMine = maskEmailForCompare(user?.email)
    return maskedMine && maskedMine === comment.user_email_masked
  }
  const canDeleteComment = (comment: Comment) => {
    return isAdmin || isOwnComment(comment)
  }

  // 将平铺评论分成顶级与回复（一级）
  const roots = comments.filter(c => !c.parent_id)
  const repliesByParent = comments
    .filter(c => !!c.parent_id)
    .reduce<Record<string, Comment[]>>((acc, c) => {
      const key = c.parent_id as string
      acc[key] = acc[key] || []
      acc[key].push(c)
      return acc
    }, {})

  const openAttachment = async (path: string) => {
    try {
      const url = await getAttachmentSignedUrl(path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e: any) {
      toast({ title: '无法打开附件', description: e.message || '请稍后再试', variant: 'destructive' })
    }
  }

  const renderAttachments = (list: NonNullable<Comment['attachments']>) => {
    if (!list || list.length === 0) return null
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {list.map(att => {
          const isImage = att.mime_type?.startsWith('image/')
          return (
            <Button
              key={att.id || att.file_path}
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => openAttachment(att.file_path)}
              title={`${att.file_name} · ${formatBytes(att.size)}`}
            >
              {isImage ? <ImageIcon className="h-4 w-4 mr-1" /> : <FileIcon className="h-4 w-4 mr-1" />}
              <span className="max-w-[140px] truncate">{att.file_name}</span>
            </Button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {canComment ? (
        <div className="space-y-2">
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
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
            >
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? '提交中...' : '提交评论'}
            </Button>
          </div>

          {attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {attachments.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-2 py-1 rounded-md border bg-white"
                  title={f.name}
                >
                  <span className="text-xs max-w-[160px] truncate">{f.name}</span>
                  <span className="text-[10px] text-gray-500">{formatBytes(f.size)}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAttachment(idx)}>
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
          您需要从主系统登录才能添加评论
        </div>
      )}

      <div className="space-y-4 mt-6">
        <h3 className="text-lg font-medium">评论 ({roots.length})</h3>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : roots.length > 0 ? (
          <div className="space-y-4">
            {roots.map((comment) => {
              const meCanDelete = canDeleteComment(comment)
              const child = repliesByParent[comment.id] || []
              return (
                <div key={comment.id} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">匿名用户</div>
                      <div className="text-sm text-gray-500">{formatDate(comment.created_at)}</div>
                    </div>

                    {meCanDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Trash2 className="h-4 w-4 text-red-500" />
                            <span className="sr-only">删除评论</span>
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

                  <div className="mt-2 whitespace-pre-wrap break-words">{comment.content}</div>

                  {comment.attachments && renderAttachments(comment.attachments)}

                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyOpen(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                    >
                      <Reply className="h-4 w-4 mr-1" />
                      回复
                    </Button>
                  </div>

                  {replyOpen[comment.id] && (
                    <div className="mt-3 space-y-2">
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
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleSubmitReply(comment.id)}
                          disabled={replySubmitting[comment.id] || !(replyText[comment.id] || '').trim()}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          {replySubmitting[comment.id] ? '提交中...' : '提交回复'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* 子回复列表 */}
                  {child.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {child.map(rep => {
                        const meCanDeleteReply = canDeleteComment(rep)
                        return (
                          <div key={rep.id} className="bg-white border rounded-md p-3">
                            <div className="flex justify-between items-start gap-3">
                              <div className="min-w-0">
                                <div className="font-medium text-sm">匿名用户</div>
                                <div className="text-xs text-gray-500">{formatDate(rep.created_at)}</div>
                              </div>
                              {meCanDeleteReply && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>确认删除</AlertDialogTitle>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>取消</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteComment(rep.id)}>
                                        删除
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                            <div className="mt-1 whitespace-pre-wrap break-words text-sm">{rep.content}</div>
                            {rep.attachments && renderAttachments(rep.attachments)}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">暂无评论</div>
        )}
      </div>
    </div>
  )
}