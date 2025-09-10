import { supabase } from '@/lib/supabaseClient';

// --- Type Definitions ---

export type Role = {
  id: number;
  name: string;
};

// Represents the data structure for a user row in the UI, matching the RPC response
export type UserRow = {
  id: string; // profile id
  user_id: string; // auth.users id
  email: string;
  name: string | null;
  role_id: number;
  role_name: string;
  last_sign_in_at: string | null;
  created_at: string;
  total_count: number; // Total number of users matching the filter
};

// Represents the structure of the 'profiles' table
type Profile = {
  id: string;
  user_id: string;
  name: string | null;
  role_id: number;
  created_at: string;
};

// --- Helper Functions ---

// Generic helper to handle Supabase query responses in a type-safe way
const handleResponse = <T>(response: { data: any; error: any; count?: number | null }, count?: 'exact') => {
  if (response.error) {
    console.error('Database Error:', response.error);
    throw response.error;
  }
  if (count === 'exact') {
    return {
      data: (response.data as T) || [],
      count: response.count || 0,
    };
  }
  return (response.data as T) || null;
};

// --- Service Functions ---

/**
 * Fetches a list of roles.
 * Provides a fallback list if the database call fails.
 */
export async function listRoles(): Promise<Role[]> {
  const { data, error } = await supabase.from('roles').select('*');
  if (error) {
    console.warn('Could not fetch roles from DB, using fallback. Error:', error);
    return [
      { id: 0, name: '超级管理员' },
      { id: 1, name: '管理员' },
      { id: 2, name: '经理' },
      { id: 3, name: '开发者' },
      { id: 4, name: '提交者' },
    ];
  }
  return data || [];
}

/**
 * Fetches a paginated and filterable list of users using the `get_users_with_details` RPC.
 * This provides a complete user object with profile and auth details.
 */
export async function listUsers(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  role_id?: number;
}): Promise<{ users: UserRow[]; total: number }> {
  const response = await supabase.rpc('get_users_with_details', {
    page_number: params.page ?? 1,
    page_size: params.pageSize ?? 10,
    search_query: params.search || null,
    role_filter: params.role_id ?? null,
  });

  const { data, error } = response;

  if (error) {
    console.error('Error fetching users via RPC:', error);
    throw error;
  }

  const users = (data as UserRow[]) || [];
  const total = users.length > 0 ? users[0].total_count : 0;

  return { users, total };
}

/**
 * Updates a user's role using the RPC function.
 */
export async function setUserRole(profileId: string, roleId: number): Promise<any> {
  const { data, error } = await supabase.rpc('update_user_role', {
    profile_id: profileId,
    new_role_id: roleId
  });

  if (error) {
    console.error('Error updating user role:', error);
    throw error;
  }

  return data;
}

// NOTE: The following functions require Supabase Edge Functions with admin privileges.
// They are kept for reference but may not be functional without a proper backend setup.

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`;

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Authentication required.');
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

export async function createUser(params: { email: string; password: string; name?: string; role_id?: number }) {
  const { data, error } = await supabase.rpc('create_new_user', {
    user_email: params.email,
    user_password: params.password,
    user_name: params.name || null,
    user_role_id: params.role_id || 3
  });

  if (error) {
    console.error('Error creating user:', error);
    throw new Error(error.message);
  }

  // 检查返回的结果
  if (data && !data.success) {
    throw new Error(data.error || '创建用户失败');
  }

  return data;
}

export async function resetPassword(userId: string) {
  const { data, error } = await supabase.rpc('request_password_reset', {
    target_user_id: userId
  });

  if (error) {
    console.error('Error requesting password reset:', error);
    throw error;
  }

  return data;
}