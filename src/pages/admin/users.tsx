import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { listAdmins, createUser, setAdmin } from '@/services/admin-service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { useNavigate } from 'react-router-dom'

export default function AdminUsersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [admins, setAdmins] = useState<{ user_id: string; created_at: string }[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [makeAdmin, setMakeAdmin] = useState(true)
  const [error, setError] = useState<string>('')

  const isAdmin = (user as any)?.role_id === 0 || user?.role === 'admin'

  useEffect(() => {
    if (!isAdmin) {
      navigate('/') // 非管理员不可见
      return
    }
    ;(async () => {
      try {
        const r = await listAdmins()
        setAdmins(r.admins)
      } catch (e: any) {
        setError(e.message || '加载失败')
      }
    })()
  }, [isAdmin, navigate])

  if (!isAdmin) return null

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader><CardTitle>创建用户</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {error && <Alert>{error}</Alert>}
          <Input placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="密码" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Input placeholder="姓名（可选）" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={makeAdmin} onChange={(e) => setMakeAdmin(e.target.checked)} />
            设为管理员
          </label>
          <Button onClick={async () => {
            setError('')
            try {
              await createUser({ email, password, name, make_admin: makeAdmin })
              setEmail(''); setPassword(''); setName('')
              const r = await listAdmins(); setAdmins(r.admins)
            } catch (e: any) { setError(e.message || '创建失败') }
          }}>创建</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>管理员列表</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {admins.map(a => (
            <div key={a.user_id} className="flex items-center justify-between">
              <span className="font-mono text-xs">{a.user_id}</span>
              <Button variant="outline" onClick={async () => {
                try { await setAdmin(a.user_id, false); setAdmins(prev => prev.filter(x => x.user_id !== a.user_id)) }
                catch { /* ignore */ }
              }}>取消管理员</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}