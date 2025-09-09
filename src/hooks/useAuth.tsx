import { User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, Profile, Role } from '../lib/supabaseClient';

// --- TYPE DEFINITIONS ---
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean; // True while checking session and fetching profile
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}

// --- CONTEXT CREATION ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- HELPER FUNCTION ---
/**
 * Fetches a user's profile and role from the database.
 * This is a critical step in the authentication process.
 * @param userId The user's ID from Supabase Auth.
 * @returns The user's profile with role information, or null if not found.
 */
const fetchProfile = async (userId: string): Promise<Profile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`*, role:roles(*)`) // Joins with the roles table
      .eq('user_id', userId) // Match against the user_id foreign key
      .single();

    if (error) {
      console.error('Auth: Failed to fetch user profile.', error);
      // If profile doesn't exist, try to fetch by id
      const { data: profileById, error: errorById } = await supabase
        .from('profiles')
        .select(`*, role:roles(*)`)
        .eq('id', userId)
        .single();
      
      if (errorById) {
        console.error('Auth: Failed to fetch profile by id as well.', errorById);
        return null;
      }
      return profileById as Profile & { role: Role };
    }
    return data as Profile & { role: Role };
  } catch (err) {
    console.error('Auth: An exception occurred while fetching profile.', err);
    return null;
  }
};

// --- AUTH PROVIDER COMPONENT ---
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true); // Start loading, app is blocked
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // onAuthStateChange is the single source of truth for the user's session.
    // It fires immediately on component mount with the current session state.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[Auth] Event received: ${event}`);

        // A session exists (either from initial load or a new login).
        // We MUST now fetch the profile to get the user's role.
        if (session?.user) {
          // If the user object is already the one we have, we might not need to refetch.
          // However, fetching ensures profile is always up-to-date.
          // For robustness, we fetch every time a session is confirmed.
          try {
            const userProfile = await fetchProfile(session.user.id);
            setUser(session.user);
            setProfile(userProfile);
          } catch (error) {
            console.error('[Auth] Failed to fetch profile, but continuing with basic user info:', error);
            // Create a basic profile if fetch fails
            const basicProfile: Profile = {
              id: session.user.id,
              name: session.user.email?.split('@')[0] || 'User',
              full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
              role_id: 3, // Default user role
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              user_id: session.user.id,
              avatar_url: session.user.user_metadata?.avatar_url || null,
              department: null,
              position: null,
              phone: null
            };
            setUser(session.user);
            setProfile(basicProfile);
          }
        } else {
          // No session, so clear user and profile.
          setUser(null);
          setProfile(null);
        }
        
        // CRITICAL: Unlock the app only AFTER the entire auth flow (including profile fetch) is complete.
        console.log('[Auth] Auth check finished. Unlocking the application.');
        setLoading(false);
      }
    );

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log('[Auth] Timeout reached, unlocking application');
      setLoading(false);
    }, 5000);

    // Cleanup function to unsubscribe from the listener when the component unmounts.
    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []); // Empty dependency array ensures this runs only once on mount.

  // --- AUTH ACTIONS ---

  const signIn = async (email: string, password: string) => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Auth: Sign in failed.', error);
      setError(error.message);
      throw error;
    }
    // The onAuthStateChange listener will handle the successful sign-in event.
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Auth: Sign out failed.', error);
      setError(error.message);
    }
    // The onAuthStateChange listener will handle the sign-out.
    // We redirect to ensure a fully clean state.
    window.location.href = '/';
  };

  // --- DERIVED STATE ---

  const isAdmin = profile?.role_id === 1 || profile?.role_id === 0;
  const isSuperAdmin = profile?.role_id === 0;

  // --- PROVIDER VALUE ---

  const value = {
    user,
    profile,
    loading,
    error,
    signIn,
    signOut,
    isAdmin,
    isSuperAdmin,
  };

  // While loading, you might want to render a global spinner here,
  // but for flexibility, we'll let consuming components decide based on the `loading` flag.
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// --- HOOK ---

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;