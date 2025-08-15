import { z } from 'zod'

const EnvSchema = z.object({
  VITE_AUTH_MODE: z.enum(['standalone', 'sso']).default('standalone'),
  VITE_MAIN_APP_ORIGIN: z.string().optional(),   // 兼容旧字段（单个来源）
  VITE_MAIN_APP_ORIGINS: z.string().optional(),  // 新字段，逗号分隔多个来源
  VITE_ALLOWED_EMAIL_DOMAIN: z.string().optional(),
  VITE_SSO_PROVIDER: z.string().optional(),
  VITE_SUPABASE_URL: z.string(),
  VITE_SUPABASE_ANON_KEY: z.string(),
  VITE_DISABLE_ORIGIN_CHECK: z.string().optional(),
})

const parsed = EnvSchema.safeParse({
  VITE_AUTH_MODE: import.meta.env.VITE_AUTH_MODE,
  VITE_MAIN_APP_ORIGIN: import.meta.env.VITE_MAIN_APP_ORIGIN,
  VITE_MAIN_APP_ORIGINS: import.meta.env.VITE_MAIN_APP_ORIGINS,
  VITE_ALLOWED_EMAIL_DOMAIN: import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN,
  VITE_SSO_PROVIDER: import.meta.env.VITE_SSO_PROVIDER,
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_DISABLE_ORIGIN_CHECK: import.meta.env.VITE_DISABLE_ORIGIN_CHECK,
})

if (!parsed.success) {
  console.warn('Environment variables validation failed:', parsed.error.flatten().fieldErrors)
}

const toOrigins = (s?: string) =>
  (s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

const mainOrigins =
  parsed.success
    ? (toOrigins(parsed.data.VITE_MAIN_APP_ORIGINS) as string[]).length > 0
      ? toOrigins(parsed.data.VITE_MAIN_APP_ORIGINS)
      : toOrigins(parsed.data.VITE_MAIN_APP_ORIGIN)
    : []

const disableOriginCheck =
  parsed.success
    ? ['1', 'true', 'yes', 'on'].includes(String(parsed.data.VITE_DISABLE_ORIGIN_CHECK || '').toLowerCase())
    : false

export const ENV = {
  AUTH_MODE: (parsed.success ? parsed.data.VITE_AUTH_MODE : 'standalone') as 'standalone' | 'sso',
  MAIN_APP_ORIGINS: mainOrigins,
  ALLOWED_EMAIL_DOMAIN: parsed.success ? parsed.data.VITE_ALLOWED_EMAIL_DOMAIN : undefined,
  SSO_PROVIDER: parsed.success ? parsed.data.VITE_SSO_PROVIDER : undefined,
  SUPABASE_URL: parsed.success ? parsed.data.VITE_SUPABASE_URL : '',
  SUPABASE_ANON_KEY: parsed.success ? parsed.data.VITE_SUPABASE_ANON_KEY : '',
  DISABLE_ORIGIN_CHECK: disableOriginCheck,
}
