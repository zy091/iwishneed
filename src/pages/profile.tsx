import React, { useEffect, useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/auth-service'

export default function ProfilePage() {
  const { user, setExternalUser } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      name: user?.name || '',
      email: user?.email || ''
    }))
  }, [user?.name, user?.email])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !/^[\u4e00-\u9fa5]+$/.test(formData.name.trim())) {
      toast({ title: '错误', description: '昵称必须为中文字符', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      await authService.updateProfile({ name: formData.name.trim() })
      // 刷新本地上下文（如不可用则回退刷新页面）
      if (typeof setExternalUser === 'function') {
        setExternalUser({
          ...(user as any),
          name: formData.name.trim(),
          avatar: undefined
        })
      } else {
        // 回退方案，避免上下文不一致
        setTimeout(() => window.location.reload(), 300)
      }
      toast({ title: '成功', description: '个人资料更新成功' })
    } catch (err: any) {
      toast({ title: '错误', description: `更新失败：${err?.message || ''}`, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.newPassword !== formData.confirmPassword) {
      toast({ title: '错误', description: '新密码和确认密码不匹配', variant: 'destructive' })
      return
    }
    if (!formData.newPassword || formData.newPassword.length < 6) {
      toast({ title: '错误', description: '新密码长度至少6位', variant: 'destructive' })
      return
    }
    setLoading(true)
    try {
      await authService.updatePassword(formData.newPassword)
      toast({ title: '成功', description: '密码修改成功' })
      setFormData(prev => ({ ...prev, newPassword: '', confirmPassword: '' }))
    } catch (err: any) {
      toast({ title: '错误', description: `密码修改失败：${err?.message || ''}`, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const firstChar = (formData.name || user?.name || '用').slice(0, 1)

  return (
    <div className="container max-w-2xl mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>个人资料</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">{firstChar}</AvatarFallback>
            </Avatar>
            <div className="text-sm text-muted-foreground">
              头像默认显示昵称首字
            </div>
          </div>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <Label htmlFor="name">昵称（中文）</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="请输入中文昵称"
              />
            </div>
            <div>
              <Label htmlFor="email">邮箱</Label>
              <Input id="email" value={formData.email} disabled />
            </div>
            <Button type="submit" disabled={loading}>
              保存资料
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>修改密码</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">新密码</Label>
              <Input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="至少6位"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">确认新密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </div>
            <Button type="submit" disabled={loading}>
              修改密码
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}