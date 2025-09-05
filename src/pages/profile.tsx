import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabaseClient'
import { toast } from 'sonner'

export default function ProfilePage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      // 更新 profiles 表中的姓名
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ name: formData.name })
        .eq('id', user.id)

      if (profileError) throw profileError

      toast.success('个人资料更新成功')
    } catch (error: any) {
      toast.error('更新失败：' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.currentPassword || !formData.newPassword) {
      toast.error('请填写当前密码和新密码')
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('新密码和确认密码不匹配')
      return
    }

    if (formData.newPassword.length < 6) {
      toast.error('新密码长度至少6位')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword
      })

      if (error) throw error

      toast.success('密码修改成功')
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }))
    } catch (error: any) {
      toast.error('密码修改失败：' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getRoleName = (roleId?: number) => {
    const roleMap: Record<number, string> = {
      0: '超级管理员',
      1: '管理员',
      2: '经理',
      3: '开发者',
      4: '提交者'
    }
    return roleMap[roleId || 4] || '提交者'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">个人资料</h1>
        <p className="text-gray-600">管理您的账户信息和偏好设置</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* 用户信息卡片 */}
        <Card>
          <CardHeader>
            <CardTitle>用户信息</CardTitle>
            <CardDescription>您的基本账户信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="text-lg">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">{user?.name}</h3>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <p className="text-sm text-blue-600">{getRoleName((user as any)?.role_id)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 编辑资料 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>编辑资料</CardTitle>
            <CardDescription>更新您的个人信息</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">姓名</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="请输入您的姓名"
                  />
                </div>
                <div>
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">邮箱地址无法修改</p>
                </div>
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? '保存中...' : '保存更改'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* 修改密码 */}
      <Card>
        <CardHeader>
          <CardTitle>修改密码</CardTitle>
          <CardDescription>为了账户安全，建议定期更换密码</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <Label htmlFor="currentPassword">当前密码</Label>
              <Input
                id="currentPassword"
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="请输入当前密码"
              />
            </div>
            <div>
              <Label htmlFor="newPassword">新密码</Label>
              <Input
                id="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="请输入新密码（至少6位）"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">确认新密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="请再次输入新密码"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? '修改中...' : '修改密码'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}