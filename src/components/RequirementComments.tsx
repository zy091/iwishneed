import { useState, useEffect, useRef } from 'react';
import { Trash2, Paperclip, X, Image, FileText, ZoomIn, Download } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { commentService, RequirementComment, CommentAttachment } from '@/services/comment-service';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useToast } from './ui/use-toast';

interface RequirementCommentsProps {
  requirementId: string;
}

interface ImageAttachmentProps {
  attachment: CommentAttachment;
  attachmentUrl?: string;
  onUrlError: () => void;
  onDownload: () => void;
}

// 图片附件组件
function ImageAttachment({ attachment, attachmentUrl, onUrlError, onDownload }: ImageAttachmentProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <>
      <div className="space-y-1">
        <div className="relative group inline-block">
          {attachmentUrl ? (
            <div className="relative">
              <button
                type="button"
                className="border-0 bg-transparent p-0 cursor-pointer"
                onClick={() => setIsModalOpen(true)}
              >
                <img
                  src={attachmentUrl}
                  alt={attachment.file_name}
                  className="max-w-sm max-h-64 rounded-lg hover:opacity-90 transition-opacity"
                  onLoad={() => setImageLoaded(true)}
                  onError={onUrlError}
                />
              </button>
              {imageLoaded && (
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-white/90 hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsModalOpen(true);
                      }}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="bg-white/90 hover:bg-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload();
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100" onClick={onDownload}>
              <Image className="h-5 w-5 text-gray-400" />
              <div className="flex flex-col">
                <span className="text-sm text-gray-600">图片加载失败</span>
                <span className="text-xs text-gray-400">点击下载: {attachment.file_name}</span>
              </div>
            </div>
          )}
        </div>
        <div className="text-xs text-gray-500">
          {attachment.file_name} ({formatFileSize(attachment.size)})
        </div>
      </div>

      {/* 全屏模态框 */}
      {isModalOpen && attachmentUrl && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" 
          role="button"
          tabIndex={0}
          onClick={() => setIsModalOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsModalOpen(false);
            }
          }}
        >
          <div className="relative max-w-4xl max-h-4xl p-4">
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 z-10"
              onClick={() => setIsModalOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            <button
              type="button"
              className="border-0 bg-transparent p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={attachmentUrl}
                alt={attachment.file_name}
                className="max-w-full max-h-full object-contain"
              />
            </button>
            <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded flex justify-between items-center">
              <span className="text-sm">{attachment.file_name}</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={onDownload}
              >
                <Download className="h-4 w-4 mr-1" />
                下载
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function RequirementComments({ requirementId }: RequirementCommentsProps) {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<RequirementComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const fetchedComments = await commentService.getComments(requirementId);
      
      // 为每个评论获取附件
      const commentsWithAttachments = await Promise.all(
        fetchedComments.map(async (comment) => {
          const attachments = await commentService.getCommentAttachments(comment.id);
          return { ...comment, attachments };
        })
      );
      
      setComments(commentsWithAttachments);
      
      // 预加载所有图片附件的URL
      const urlPromises: Promise<void>[] = [];
      commentsWithAttachments.forEach(comment => {
        comment.attachments?.forEach(attachment => {
          if (isImageFile(attachment.mime_type)) {
            urlPromises.push(
              commentService.getAttachmentUrl(attachment.file_path).then(url => {
                if (url) {
                  setAttachmentUrls(prev => ({
                    ...prev,
                    [attachment.id]: url
                  }));
                }
              }).catch(() => {
                // 忽略错误，继续处理其他图片
              })
            );
          }
        });
      });
      
      await Promise.all(urlPromises);
    } catch (error) {
      toast({ title: '获取评论失败', description: '无法加载评论列表。', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (requirementId) {
      fetchComments();
    }
  }, [requirementId]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;
    
    try {
      setUploading(true);
      // 强制匿名评论
      await commentService.addComment(
        requirementId, 
        user.id, 
        newComment, 
        true, // 强制匿名
        selectedFiles.length > 0 ? selectedFiles : undefined
      );
      
      setNewComment('');
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      await fetchComments();
      toast({ title: '匿名评论已发布' });
    } catch (error) {
      toast({ title: '评论失败', description: '无法发布评论。', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentService.deleteComment(commentId);
      await fetchComments();
      toast({ title: '评论已删除' });
    } catch (error) {
      toast({ title: '删除失败', description: '无法删除评论。', variant: 'destructive' });
    }
  };

  const canDelete = (comment: RequirementComment) => {
    if (!user) return false;
    return isAdmin || isSuperAdmin || comment.user_id === user.id;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
    
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast({ title: '文件过大', description: `${file.name} 超过10MB限制`, variant: 'destructive' });
        return false;
      }
      if (!allowedTypes.includes(file.type)) {
        toast({ title: '文件类型不支持', description: `${file.name} 类型不支持`, variant: 'destructive' });
        return false;
      }
      return true;
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAttachmentDownload = async (attachment: CommentAttachment) => {
    try {
      const url = await commentService.getAttachmentUrl(attachment.file_path);
      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      toast({ title: '下载失败', description: '无法下载附件', variant: 'destructive' });
    }
  };

  const isImageFile = (mimeType: string) => {
    return mimeType.startsWith('image/');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">评论</h3>
      <div className="space-y-4">
        {loading ? (
          <p>加载评论中...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-500">暂无评论。</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="flex space-x-3">
              <Avatar>
                <AvatarFallback>匿</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">匿名用户</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleString()}</p>
                    {canDelete(comment) && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteComment(comment.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                
                {/* 附件显示 */}
                {comment.attachments && comment.attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {comment.attachments.map((attachment) => (
                      <div key={attachment.id}>
                        {isImageFile(attachment.mime_type) ? (
                          // 图片显示
                          <ImageAttachment 
                            attachment={attachment}
                            attachmentUrl={attachmentUrls[attachment.id]}
                            onUrlError={() => {
                              setAttachmentUrls(prev => {
                                const newUrls = { ...prev };
                                delete newUrls[attachment.id];
                                return newUrls;
                              });
                            }}
                            onDownload={() => handleAttachmentDownload(attachment)}
                          />
                        ) : (
                          // 非图片文件显示
                          <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100" onClick={() => handleAttachmentDownload(attachment)}>
                            <FileText className="h-5 w-5 text-gray-400" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{attachment.file_name}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(attachment.size)}</p>
                            </div>
                            <Download className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 添加评论 */}
      {user && (
        <div className="space-y-4">
          <Textarea
            placeholder="添加匿名评论..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[100px]"
          />
          
          {/* 文件选择 */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                添加附件
              </Button>
              <span className="text-xs text-gray-500">支持图片、PDF、文本文件，最大10MB</span>
            </div>
            
            {/* 已选择的文件 */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      {file.type.startsWith('image/') ? (
                        <Image className="h-4 w-4 text-gray-400" />
                      ) : (
                        <FileText className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <Button onClick={handleAddComment} disabled={!newComment.trim() || uploading}>
              {uploading ? '发布中...' : '发布匿名评论'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}