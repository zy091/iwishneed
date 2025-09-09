import { User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, Profile, Role } from '../lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean; // Represents the entire auth & profile fetching process
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Fetches a user's profile and role from the database.
 * @param userId The user's ID.
 * @returns The user's profile or null if not found.
 */
const fetchProfile = async (userId: string): Promise<Profile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`*, role:roles(*)`)
      .eq('id', userId)
      .single();

    if (error) {
      console.error('获取用户资料失败:', error);
      return null;
    }
    return data as Profile & { role: Role };
  } catch (err) {
    console.error('获取用户资料异常:', err);
    return null;
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true); // loading is true until the initial auth check is complete.
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // This is the single source of truth for auth state.
    // It runs once on load with INITIAL_SESSION, and then for any subsequent auth event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[AuthProvider] Auth state change. Event: ${event}`, session?.user?.email);

        // If a user is logged in (either from initial session or new login)
        if (session?.user) {
          // Fetch their profile. This is the crucial step.
          const userProfile = await fetchProfile(session.user.id);
          setUser(session.user);
          setProfile(userProfile);
        } else {
          // If no user, clear everything.
          setUser(null);
          setProfile(null);
        }
        
        // IMPORTANT: Only set loading to false after the first check is complete.
        // This ensures the app doesn't render until we know the user's auth status AND profile.
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
            console.log('[AuthProvider] Auth check complete. Unlocking app.');
            setLoading(false);
        }
      }
    );

    return () => {
      console.log('[AuthProvider] Cleaning up auth subscription.');
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // The onAuthStateChange listener will handle the rest.
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败';
      setError(message);
      throw new Error(message);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // The onAuthStateChange listener will handle clearing state.
      window.location.href = '/'; // Redirect to ensure clean state
    } catch (err) {
      const message = err instanceof Error ? err.message : '登出失败';
      setError(message);
    }
  };

  const isAdmin = profile?.role_id === 1 || profile?.role_id === 0;
  const isSuperAdmin = profile?.role_id === 0;

  const value: AuthContextType = {
    user,
    profile,
    loading,
    error,
    signIn,
    signOut,
    isAdmin,
    isSuperAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;