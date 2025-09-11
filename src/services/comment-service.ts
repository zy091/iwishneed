import { supabase } from '@/lib/supabaseClient';
import type { Profile } from '@/types/auth';

export interface CommentAttachment {
  id: string;
  comment_id: string;
  file_name: string;
  file_path: string;
  size: number;
  mime_type: string;
  created_at: string;
}

export interface RequirementComment {
  id: string;
  created_at: string;
  requirement_id: string;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  profile?: Pick<Profile, 'name' | 'avatar_url'>;
  attachments?: CommentAttachment[];
}

class CommentService {
  async getComments(requirementId: string): Promise<RequirementComment[]> {
    // Using RPC to handle the join correctly and avoid schema/RLS issues
    const { data, error } = await supabase
      .rpc('get_comments_with_profiles', { req_id: requirementId });

    if (error) {
      console.error('Error fetching comments via rpc:', error);
      throw error;
    }

    return data || [];
  }

  async addComment(
    requirementId: string,
    userId: string,
    content: string,
    is_anonymous: boolean,
    files?: File[]
  ): Promise<RequirementComment> {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        requirement_id: requirementId,
        user_id: userId,
        content,
        is_anonymous,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      throw error;
    }

    // 如果有文件，上传文件
    if (files && files.length > 0) {
      await this.uploadCommentAttachments(data.id, files);
    }

    return data;
  }

  async uploadCommentAttachments(commentId: string, files: File[]): Promise<CommentAttachment[]> {
    const attachments: CommentAttachment[] = [];

    for (const file of files) {
      try {
        // 生成唯一文件名
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `comment-attachments/${commentId}/${fileName}`;

        // 上传文件到 Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('comments-attachments')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          continue;
        }

        // 保存附件信息到数据库
        const { data: attachment, error: dbError } = await supabase
          .from('comment_attachments')
          .insert({
            comment_id: commentId,
            file_name: file.name,
            file_path: filePath,
            size: file.size,
            mime_type: file.type,
          })
          .select()
          .single();

        if (dbError) {
          console.error('Error saving attachment info:', dbError);
          continue;
        }

        attachments.push(attachment);
      } catch (error) {
        console.error('Error processing file:', error);
      }
    }

    return attachments;
  }

  async getCommentAttachments(commentId: string): Promise<CommentAttachment[]> {
    const { data, error } = await supabase
      .from('comment_attachments')
      .select('*')
      .eq('comment_id', commentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching attachments:', error);
      return [];
    }

    return data || [];
  }

  async getAttachmentUrl(filePath: string): Promise<string | null> {
    try {
      const { data } = await supabase.storage
        .from('comments-attachments')
        .createSignedUrl(filePath, 3600); // 1小时有效期

      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error getting attachment URL:', error);
      return null;
    }
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    // 先获取附件信息
    const { data: attachment, error: fetchError } = await supabase
      .from('comment_attachments')
      .select('file_path')
      .eq('id', attachmentId)
      .single();

    if (fetchError) {
      console.error('Error fetching attachment:', fetchError);
      throw fetchError;
    }

    // 删除存储中的文件
    const { error: storageError } = await supabase.storage
      .from('comments-attachments')
      .remove([attachment.file_path]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
    }

    // 删除数据库记录
    const { error: dbError } = await supabase
      .from('comment_attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbError) {
      console.error('Error deleting attachment record:', dbError);
      throw dbError;
    }
  }

  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }
}

export const commentService = new CommentService();