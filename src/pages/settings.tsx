import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { user } = useAuth()
  const { isAdmin, isSuperAdmin } = usePermissions()
  const [loading, setLoading] = useState(false)
  const [systemInfo, setSystemInfo] = useState({
    totalUsers: 0,
    totalRequirements: 0,
    totalComments: 0
  })
  const [settings, setSettings] = useState({
    emailNotifications: true,
    browserNotifications: false,
    darkMode: false,
    autoSave: true
  })

  useEffect(() => {
    if (isAdmin) {
      loadSystemInfo()
    }
  }, [isAdmin])

  const loadSystemInfo = async () => {
    try {
      const [usersRes, requirementsRes, commentsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('requirements').select('id', { count: 'exact', head: true }),
        supabase.from('comments').select('id', { count: 'exact', head: true })
      ])

      setSystemInfo({
        totalUsers: usersRes.count || 0,
        totalRequirements: requirementsRes.count || 0,
        totalComments: commentsRes.count || 0
      })
    } catch (error) {
      console.error('Failed to load system info:', error)
    }
  }

  const handleSaveSettings = async () => {
    setLoading(true)
    try {
      // 这里可以保存用户偏好设置到数据库
      // 暂时只是本地存储演示
      localStorage.setItem('userSettings', JSON.stringify(settings))
      toast.success('设置保存成功')
    } catch (error: any) {
      toast.error('保存失败：' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClearCache = () => {
    localStorage.clear()
    sessionStorage.clear()
    toast.success('缓存清理完成')
  }

  const handleExportData = async () => {
    if (!isAdmin) return

    try {
      setLoading(true)
      // 导出用户数据（仅管理员）
      const { data: users } = await supabase
        .from('profiles')
        .select('id, name, role_id, created_at')

      const dataStr = JSON.stringify(users, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `users_export_${new Date().toISOString().split('T')[0]}.json`
      link.click()
      
      URL.revokeObjectURL(url)
      toast.success('数据导出成功')
    } catch (error: any) {
      toast.error('导出失败：' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">系统设置</h1>
        <p className="text-gray-600">管理您的偏好设置和系统配置</p>
      </div>

      {/* 系统信息（仅管理员可见） */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>系统概览</CardTitle>
            <CardDescription>当前系统的基本统计信息</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{systemInfo.totalUsers}</div>
                <div className="text-sm text-gray-600">总用户数</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{systemInfo.totalRequirements}</div>
                <div className="text-sm text-gray-600">总需求数</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{systemInfo.totalComments}</div>
                <div className="text-sm text-gray-600">总评论数</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 用户偏好设置 */}
      <Card>
        <CardHeader>
          <CardTitle>偏好设置</CardTitle>
          <CardDescription>自定义您的使用体验</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-notifications">邮件通知</Label>
              <p className="text-sm text-gray-500">接收重要更新的邮件通知</p>
            </div>
            <Switch
              id="email-notifications"
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, emailNotifications: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="browser-notifications">浏览器通知</Label>
              <p className="text-sm text-gray-500">在浏览器中显示实时通知</p>
            </div>
            <Switch
              id="browser-notifications"
              checked={settings.browserNotifications}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, browserNotifications: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-save">自动保存</Label>
              <p className="text-sm text-gray-500">编辑时自动保存草稿</p>
            </div>
            <Switch
              id="auto-save"
              checked={settings.autoSave}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, autoSave: checked }))
              }
            />
          </div>

          <Button onClick={handleSaveSettings} disabled={loading}>
            {loading ? '保存中...' : '保存设置'}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* 系统维护 */}
      <Card>
        <CardHeader>
          <CardTitle>系统维护</CardTitle>
          <CardDescription>清理缓存和数据管理</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>清理缓存</Label>
              <p className="text-sm text-gray-500">清除本地存储的缓存数据</p>
            </div>
            <Button variant="outline" onClick={handleClearCache}>
              清理缓存
            </Button>
          </div>

          {isAdmin && (
            <div className="flex items-center justify-between">
              <div>
                <Label>导出数据</Label>
                <p className="text-sm text-gray-500">导出用户数据（仅管理员）</p>
              </div>
              <Button variant="outline" onClick={handleExportData} disabled={loading}>
                {loading ? '导出中...' : '导出数据'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 账户信息 */}
      <Card>
        <CardHeader>
          <CardTitle>账户信息</CardTitle>
          <CardDescription>您的账户详细信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">用户ID:</span>
            <span className="font-mono text-sm">{user?.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">邮箱:</span>
            <span>{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">角色:</span>
            <Badge variant={isSuperAdmin ? 'destructive' : isAdmin ? 'default' : 'secondary'}>
              {(user as any)?.rolename || '提交者'}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">权限级别:</span>
            <span>{(user as any)?.role_id ?? 4}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}