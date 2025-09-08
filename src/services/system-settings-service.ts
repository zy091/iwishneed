// 服务：系统设置（app_settings 表 key/value）
import { supabase } from '@/lib/supabaseClient'

export interface SystemSettings {
  enableCreativeModule: boolean
  enableTechModule: boolean
  defaultClientType?: '流量运营服务' | '全案深度服务'
}

const SETTINGS_KEY = 'global'

async function getSettings(): Promise<SystemSettings> {
  const { data, error } = await supabase.from('app_settings').select('value').eq('key', SETTINGS_KEY).maybeSingle()
  if (error) throw error
  const val = (data?.value as any) || {}
  return {
    enableCreativeModule: val.enableCreativeModule ?? true,
    enableTechModule: val.enableTechModule ?? true,
    defaultClientType: val.defaultClientType,
  }
}

async function saveSettings(value: SystemSettings): Promise<void> {
  const { error } = await supabase.from('app_settings').upsert({ key: SETTINGS_KEY, value })
  if (error) throw error
}

export const systemSettingsService = {
  getSettings,
  saveSettings,
}