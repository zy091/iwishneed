import { Profile } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';

export interface RequirementComment {
  id: string;
  created_at: string;
  requirement_id: string;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  profile?: Pick<Profile, 'name' | 'avatar_url'>;
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
    is_anonymous: boolean
  ): Promise<RequirementComment> {
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
      console.error('Error adding comment:', error);
      throw error;
    }
    return data;
  }

  async deleteComment(commentId: string): Promise<void> {
    const { error } = await supabase
      .from('requirement_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }
}

export const commentService = new CommentService();