import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase, Profile, Role } from '../lib/supabaseClient'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  isAdmin: boolean
  isSuperAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true) // Start with loading true
  const [error, setError] = useState<string | null>(null)

  // Memoized fetch profile function to avoid re-creation on re-renders
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`*, role:roles(*)`)
        .eq('id', userId)
        .single()

      if (error) {
        console.error('获取用户资料失败:', error)
        return null
      }
      return data as Profile & { role: Role }
    } catch (err) {
      console.error('获取用户资料异常:', err)
      return null
    }
  }

  useEffect(() => {
    setLoading(true);
    console.log('[AuthProvider] useEffect started. Initializing auth state...');

    const checkInitialSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }

        if (session?.user) {
          console.log('[AuthProvider] Initial session found for user:', session.user.email);
          const userProfile = await fetchProfile(session.user.id);
          setUser(session.user);
          setProfile(userProfile);
        } else {
          console.log('[AuthProvider] No initial session found.');
          setUser(null);
          setProfile(null);
        }
      } catch (e) {
        console.error('[AuthProvider] Error during initial session check:', e);
        setError(e instanceof Error ? e.message : 'Failed to check session.');
      } finally {
        console.log('[AuthProvider] Initial check complete. Setting loading to false.');
        setLoading(false);
      }
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[AuthProvider] Auth state changed. Event: ${event}`, session?.user?.email);
        if (event === 'SIGNED_IN' && session?.user) {
          const userProfile = await fetchProfile(session.user.id);
          setUser(session.user);
          setProfile(userProfile);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
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
      setLoading(true)
      setError(null)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      // The onAuthStateChange listener will handle setting user and profile
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
        setError(error.message);
        return;
      }
      // The onAuthStateChange listener will handle clearing user and profile
      // Redirect to home to ensure a clean state
      window.location.href = '/';
    } catch (err) {
      const message = err instanceof Error ? err.message : '登出失败';
      setError(message);
    }
  }

  const isAdmin = profile?.role_id === 1 || profile?.role_id === 0
  const isSuperAdmin = profile?.role_id === 0

  const value: AuthContextType = {
    user,
    profile,
    loading,
    error,
    signIn,
    signOut,
    isAdmin,
    isSuperAdmin,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default useAuth