import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { commentService, RequirementComment } from '@/services/comment-service';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Trash2 } from 'lucide-react';
import { useToast } from './ui/use-toast';

interface RequirementCommentsProps {
  requirementId: string;
}

export default function RequirementComments({ requirementId }: RequirementCommentsProps) {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<RequirementComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const fetchedComments = await commentService.getComments(requirementId);
      setComments(fetchedComments);
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
      await commentService.addComment(requirementId, user.id, newComment, isAnonymous);
      setNewComment('');
      setIsAnonymous(false);
      await fetchComments();
      toast({ title: '评论已发布' });
    } catch (error) {
      toast({ title: '评论失败', description: '无法发布评论。', variant: 'destructive' });
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

  const getCommentAuthor = (comment: RequirementComment) => {
    if (comment.is_anonymous) return '匿名用户';
    return comment.profile?.name || '未知用户';
  };
  
  const getCommentAvatar = (comment: RequirementComment) => {
    if (comment.is_anonymous) return '匿';
    const name = comment.profile?.name || 'U';
    return name.charAt(0).toUpperCase();
  }

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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox id="anonymous" checked={isAnonymous} onCheckedChange={(checked) => setIsAnonymous(Boolean(checked))} />
              <label htmlFor="anonymous" className="text-sm font-medium">匿名评论</label>
            </div>
            <Button onClick={handleAddComment} disabled={!newComment.trim()}>发布</Button>
          </div>
        </div>
      )}
    </div>
  );
}