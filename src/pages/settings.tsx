import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { systemSettingsService, type SystemSettings } from '@/services/system-settings-service'
import { logger } from '@/lib/logger'

export default function SettingsPage() {
  const [form, setForm] = useState<SystemSettings>({ enableCreativeModule: true, enableTechModule: true })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const run = async () => {
      try {
        const s = await systemSettingsService.getSettings()
        setForm(s)
      } catch (e) {
        logger.error('Failed to load settings', e)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await systemSettingsService.saveSettings(form)
    } catch (e) {
      logger.error('Failed to save settings', e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center items-center h-64">加载�?..</div>

  return (
    <div className="container mx-auto py-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>系统设置</CardTitle>
          <CardDescription>配置模块开关与默认选项</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="tech">启用技术部模块</Label>
            <Switch id="tech" checked={form.enableTechModule} onCheckedChange={(v) => setForm(prev => ({ ...prev, enableTechModule: !!v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="creative">启用创意部模�?/Label>
            <Switch id="creative" checked={form.enableCreativeModule} onCheckedChange={(v) => setForm(prev => ({ ...prev, enableCreativeModule: !!v }))} />
          </div>
          <div>
            <Label>默认客户类型</Label>
            <Select value={form.defaultClientType || ''} onValueChange={(v) => setForm(prev => ({ ...prev, defaultClientType: v as any }))}>
              <SelectTrigger className="w-60"><SelectValue placeholder="选择默认客户类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="流量运营服务">流量运营服务</SelectItem>
                <SelectItem value="全案深度服务">全案深度服务</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>{saving ? '保存�?..' : '保存设置'}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
