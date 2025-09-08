// 服务：认证/个人资料（基于 Supabase Auth）
import { supabase } from '@/lib/supabaseClient'

export interface Profile {
  id: string
  email?: string
  name?: string
  avatar?: string
}

async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!user) return null
  const { id, email, user_metadata } = user
  return { id, email: email || undefined, name: user_metadata?.name, avatar: user_metadata?.avatar } as Profile
}

async function updateProfile(patch: { name?: string; avatar?: string }): Promise<Profile> {
  const { data, error } = await supabase.auth.updateUser({ data: { ...patch } })
  if (error) throw error
  const user = data.user
  return { id: user.id, email: user.email || undefined, name: user.user_metadata?.name, avatar: user.user_metadata?.avatar }
}

async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

export const authService = {
  getCurrentProfile,
  updateProfile,
  updatePassword,
}