import { supabase } from '@/lib/supabaseClient';
import type { Profile } from '@/types/auth';

export interface TechCommentAttachment {
  id: string;
  comment_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface TechRequirementComment {
  id: string;
  created_at: string;
  requirement_id: string;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  profile?: Pick<Profile, 'name' | 'avatar_url'>;
  attachments?: TechCommentAttachment[];
}

class TechCommentService {
  async getComments(requirementId: string): Promise<TechRequirementComment[]> {
    const { data, error } = await supabase
      .from('requirement_comments')
      .select(`
        id,
        created_at,
        requirement_id,
        user_id,
        content,
        is_anonymous
      `)
      .eq('requirement_id', requirementId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tech comments:', error);
      throw error;
    }

    // 为每个评论获取附件
    const commentsWithAttachments = await Promise.all(
      (data || []).map(async (comment) => {
        const attachments = await this.getCommentAttachments(comment.id);
        return { ...comment, attachments };
      })
    );

    return commentsWithAttachments;
  }

  async addComment(
    requirementId: string,
    userId: string,
    content: string,
    is_anonymous: boolean,
    files?: File[]
  ): Promise<TechRequirementComment> {
    const { data, error } = await supabase
      .from('requirement_comments')
      .insert({
        requirement_id: requirementId,
        user_id: userId,
        content,
        is_anonymous,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding tech comment:', error);
      throw error;
    }

    // 如果有文件，上传文件
    if (files && files.length > 0) {
      await this.uploadCommentAttachments(data.id, requirementId, files);
    }

    return data;
  }

  async uploadCommentAttachments(commentId: string, requirementId: string, files: File[]): Promise<TechCommentAttachment[]> {
    const attachments: TechCommentAttachment[] = [];

    for (const file of files) {
      try {
        // 生成唯一文件名
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `tech-requirements/${requirementId}/${fileName}`;

        // 上传文件到 Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('comments-attachments')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Error uploading tech file:', uploadError);
          continue;
        }

        // 保存附件信息到数据库
        const { data: attachment, error: dbError } = await supabase
          .from('requirement_comment_attachments')
          .insert({
            comment_id: commentId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
          })
          .select()
          .single();

        if (dbError) {
          console.error('Error saving tech attachment info:', dbError);
          continue;
        }

        attachments.push(attachment);
      } catch (error) {
        console.error('Error processing tech file:', error);
      }
    }

    return attachments;
  }

  async getCommentAttachments(commentId: string): Promise<TechCommentAttachment[]> {
    const { data, error } = await supabase
      .from('requirement_comment_attachments')
      .select('*')
      .eq('comment_id', commentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tech attachments:', error);
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
      console.error('Error getting tech attachment URL:', error);
      return null;
    }
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    // 先获取附件信息
    const { data: attachment, error: fetchError } = await supabase
      .from('requirement_comment_attachments')
      .select('file_path')
      .eq('id', attachmentId)
      .single();

    if (fetchError) {
      console.error('Error fetching tech attachment:', fetchError);
      throw fetchError;
    }

    // 删除存储中的文件
    const { error: storageError } = await supabase.storage
      .from('comments-attachments')
      .remove([attachment.file_path]);

    if (storageError) {
      console.error('Error deleting tech file from storage:', storageError);
    }

    // 删除数据库记录
    const { error: dbError } = await supabase
      .from('requirement_comment_attachments')
      .delete()
      .eq('id', attachmentId);

    if (dbError) {
      console.error('Error deleting tech attachment record:', dbError);
      throw dbError;
    }
  }

  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('requirement_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting tech comment:', error);
      throw error;
    }
  }
}

export const techCommentService = new TechCommentService();