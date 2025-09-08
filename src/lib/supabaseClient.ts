import { createClient } from '@supabase/supabase-js'
import { ENV } from '@/config/env'

const supabaseUrl = ENV.SUPABASE_URL
const supabaseAnonKey = ENV.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

if (import.meta.env.DEV) {
  // 仅开发环境打印
  // eslint-disable-next-line no-console
  console.log('✅ Supabase client initialized')
}
