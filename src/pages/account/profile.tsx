import React, { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { authService } from '@/services/auth-service'
import { useAuth } from '@/hooks/use-auth'

export default function ProfilePage() {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)

  useEffect(() => {
    const run = async () => {
      try {
        const p = await authService.getCurrentProfile()
        if (p) {
          setName(p.name || '')
          setAvatar(p.avatar || '')
          setEmail(p.email || '')
        }
      } catch (e) {
        console.error('加载个人资料失败', e)
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const saveProfile = async () => {
    setSaving(true)
    try {
      await authService.updateProfile({ name, avatar })
    } catch (e) {
      console.error('更新资料失败', e)
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async () => {
    if (!password) return
    setPwdSaving(true)
    try {
      await authService.updatePassword(password)
      setPassword('')
    } catch (e) {
      console.error('修改密码失败', e)
    } finally {
      setPwdSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">加载中...</div>
  }

  return (
    <div className="container mx-auto py-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>个人资料</CardTitle>
          <CardDescription>查看和更新您的账户信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>邮箱</Label>
              <Input value={email} disabled />
            </div>
            <div>
              <Label>昵称</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="您的显示名称" />
            </div>
          </div>
          <div>
            <Label>头像地址</Label>
            <Input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={saving}>{saving ? '保存中...' : '保存资料'}</Button>
          </div>
          <hr />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>新密码</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位" />
            </div>
            <div className="flex items-end">
              <Button onClick={changePassword} disabled={pwdSaving || !password}>{pwdSaving ? '提交中...' : '修改密码'}</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}