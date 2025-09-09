import { useState, useEffect, useRef } from 'react';

import { Trash2, Paperclip, Download, X, Image, FileText } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { commentService, RequirementComment, CommentAttachment } from '@/services/comment-service';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import { useToast } from './ui/use-toast';

interface RequirementCommentsProps {
  requirementId: string;
}

export default function RequirementComments({ requirementId }: RequirementCommentsProps) {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<RequirementComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
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
      await commentService.addComment(
        requirementId, 
        user.id, 
        newComment, 
        isAnonymous,
        selectedFiles.length > 0 ? selectedFiles : undefined
      );
      
      setNewComment('');
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      await fetchComments();
      toast({ title: '评论已发布' });
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

  const canSeeRealName = (comment: RequirementComment) => {
    if (!user) return false;
    // 管理员或评论作者本人可以看到真实姓名
    return isAdmin || isSuperAdmin || comment.user_id === user.id;
  };

  const getCommentAuthor = (comment: RequirementComment) => {
    if (comment.is_anonymous) {
      // 如果是匿名评论，只有管理员和作者本人能看到真实姓名
      if (canSeeRealName(comment)) {
        return `${comment.profile?.name || '未知用户'} (匿名)`;
      }
      return '匿名用户';
    }
    return comment.profile?.name || '未知用户';
  };
  
  const getCommentAvatar = (comment: RequirementComment) => {
    if (comment.is_anonymous && !canSeeRealName(comment)) {
      return '匿';
    }
    const name = comment.profile?.name || 'U';
    return name.charAt(0).toUpperCase();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/', 'application/pdf', 'text/', 'application/msword', 'application/vnd.openxmlformats-officedocument'];
    
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast({ title: '文件过大', description: `${file.name} 超过10MB限制`, variant: 'destructive' });
        return false;
      }
      
      const isValidType = allowedTypes.some(type => file.type.startsWith(type));
      if (!isValidType) {
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
                <AvatarFallback>{getCommentAvatar(comment)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{getCommentAuthor(comment)}</p>
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
                  <div className="mt-2 space-y-1">
                    {comment.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center space-x-2 bg-gray-50 p-2 rounded cursor-pointer hover:bg-gray-100"
                        onClick={() => handleAttachmentDownload(attachment)}
                      >
                        {isImageFile(attachment.mime_type) ? (
                          <Image className="h-4 w-4 text-blue-500" />
                        ) : (
                          <FileText className="h-4 w-4 text-gray-500" />
                        )}
                        <span className="text-sm">{attachment.file_name}</span>
                        <span className="text-xs text-gray-500">({formatFileSize(attachment.file_size)})</span>
                        <Download className="h-3 w-3 text-gray-400" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {user && (
        <div className="space-y-4 pt-4 border-t">
          <Textarea
            placeholder="添加评论..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
          />
          
          {/* 文件选择区域 */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Paperclip className="h-4 w-4 mr-1" />
                添加附件
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
            </div>
            
            {/* 已选择的文件列表 */}
            {selectedFiles.length > 0 && (
              <div className="space-y-1">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                    <div className="flex items-center space-x-2">
                      {isImageFile(file.type) ? (
                        <Image className="h-4 w-4 text-blue-500" />
                      ) : (
                        <FileText className="h-4 w-4 text-gray-500" />
                      )}
                      <span>{file.name}</span>
                      <span className="text-gray-500">({formatFileSize(file.size)})</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
              />
              <label htmlFor="anonymous" className="text-sm">匿名评论</label>
            </div>
            <Button 
              onClick={handleAddComment} 
              disabled={!newComment.trim() || uploading}
            >
              {uploading ? '发布中...' : '发布评论'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}