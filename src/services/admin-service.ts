import { supabase } from '@/lib/supabaseClient';

// --- Type Definitions ---

export type Role = {
  id: number;
  name: string;
};

// Represents the data structure for a user row in the UI
export type UserRow = {
  id: string; // This is the profile id (UUID)
  user_id: string; // This is the auth.users id (UUID)
  email: string; // From auth.users
  name: string | null; // From profiles
  role_id: number; // From profiles
  last_sign_in_at: string | null; // From auth.users
  created_at: string; // From auth.users
  active: boolean; // This might not be a real field, assuming default
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
 * Fetches a paginated and filterable list of users.
 * This function is complex because it needs to combine data from `auth.users` and `profiles`.
 * Supabase does not allow direct joins with `auth.users`, so we fetch from `profiles`
 * and must accept that some `UserRow` fields (like email) will be missing.
 */
export async function listUsers(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  role_id?: number;
}): Promise<{ users: Partial<UserRow>[]; total: number }> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from('profiles').select('id, user_id, name, role_id, created_at', { count: 'exact' });

  if (params.search) {
    query = query.ilike('name', `%${params.search}%`);
  }
  if (typeof params.role_id === 'number') {
    query = query.eq('role_id', params.role_id);
  }

  const response = await query.range(from, to).order('created_at', { ascending: false });
  const { data, count } = handleResponse<Profile[]>(response, 'exact');

  // Map the profile data to a partial UserRow, as we can't get all fields.
  const users: Partial<UserRow>[] = data.map(p => ({
    id: p.id,
    user_id: p.user_id,
    name: p.name,
    role_id: p.role_id,
    created_at: p.created_at,
    // email, last_sign_in_at, and active are not available from 'profiles'
  }));

  return { users, total: count };
}

/**
 * Updates a user's role in the profiles table.
 */
export async function setUserRole(userId: string, roleId: number): Promise<Profile> {
  const response = await supabase
    .from('profiles')
    .update({ role_id: roleId })
    .eq('user_id', userId)
    .select()
    .single();
  
  return handleResponse<Profile>(response);
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
  const headers = await getAuthHeaders();
  const res = await fetch(FN_BASE, { method: 'POST', headers, body: JSON.stringify({ action: 'create_user', ...params }) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function resetPassword(userId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(FN_BASE, { method: 'POST', headers, body: JSON.stringify({ action: 'reset_password', user_id: userId }) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}