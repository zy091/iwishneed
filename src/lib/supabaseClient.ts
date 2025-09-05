import { createClient } from '@supabase/supabase-js'

const fromVite = (typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined) || {}
const fromNode = (typeof process !== 'undefined' ? process.env : undefined) || {}

const supabaseUrl: string | undefined = fromVite.VITE_SUPABASE_URL || fromNode.VITE_SUPABASE_URL
const supabaseAnonKey: string | undefined = fromVite.VITE_SUPABASE_ANON_KEY || fromNode.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  const inNode = typeof window === 'undefined'
  const msg = 'Missing Supabase environment variables VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY'
  if (inNode) {
    throw new Error(msg)
  } else {
    console.warn(msg)
  }
}

export const supabase = createClient(supabaseUrl as string, supabaseAnonKey as string, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'supabase.auth.token'
  },
  global: {
    headers: {
      'X-Client-Info': 'requirement-management-system'
    }
  }
})

// 调试：检查客户端配置
console.log('Supabase client initialized:', {
  url: supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  config: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})
