import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePermissions } from '@/hooks/use-permissions'
import {
  createUser,
  listAdmins,
  listRoles,
  listUsers,
  resetPassword,
  setUserRole,
  toggleActive,
  type Role,
  type UserRow,
} from '@/services/admin-service'

export default function AdminUsersPage() {
  const { isAdmin } = usePermissions()
  const navigate = useNavigate()

  const [roles, setRoles] = useState<Role[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<number | undefined>(undefined)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [roleId, setRoleId] = useState<number | undefined>(undefined)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (!isAdmin) {
      navigate('/')
      return
    }
    ;(async () => {
      try {
        // 角色列表（后端未实现时降级为本地预设）
        try {
          const r = await listRoles()
          setRoles(r.roles)
          if (!roleId && r.roles.length) setRoleId(r.roles[0].id)
        } catch (e: any) {
          console.error('获取角色列表失败:', e)
          const fallback: Role[] = [
            { id: 0, name: '超级管理员' },
            { id: 1, name: '管理员' },
            { id: 2, name: '经理' },
            { id: 3, name: '开发者' },
            { id: 4, name: '提交者' },
          ]
          setRoles(fallback)
          if (!roleId) setRoleId(3)
        }

        await refreshUsers()
      } catch (e: any) {
        setError(e.message || '初始化失败')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, navigate])

  const refreshUsers = async () => {
    try {
      const r = await listUsers({ page, pageSize, search, role_id: roleFilter })
      setUsers(r.users)
      setTotal(r.total)
      setError('') // 清除之前的错误
    } catch (e: any) {
      console.error('获取用户列表失败:', e)
      // 后端未上线时，至少保证管理员列表可见
      try {
        const r = await listAdmins()
        const mapped: UserRow[] = r.admins.map(a => ({ id: a.user_id, email: '', role_id: 1 }))
        setUsers(mapped)
        setTotal(mapped.length)
        setError('') // 清除错误
      } catch (e2: any) {
        console.error('获取管理员列表也失败:', e2)
        setError(`加载用户列表失败: ${e.message}。请检查网络连接和Edge Function配置。`)
      }
    }
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  if (!isAdmin) return null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>创建用户</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {error && <Alert>{error}</Alert>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input type="password" placeholder="密码（≥8位，含数字、字母）" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Input placeholder="姓名（可选）" value={name} onChange={(e) => setName(e.target.value)} />
            <Select value={roleId?.toString() || ''} onValueChange={(v) => setRoleId(Number(v))}>
              <SelectTrigger><SelectValue placeholder="选择角色" /></SelectTrigger>
              <SelectContent>
                {roles.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={async () => {
              setError('')
              try {
                if (!email || !password || !roleId) throw new Error('请填写邮箱、密码并选择角色')
                await createUser({ email, password, name, role_id: roleId })
                setEmail(''); setPassword(''); setName('')
                await refreshUsers()
              } catch (e: any) {
                setError(e.message || '创建失败')
              }
            }}
          >
            创建
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>用户列表</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input className="w-60" placeholder="搜索姓名/邮箱" value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={(roleFilter ?? '').toString()} onValueChange={(v) => setRoleFilter(v ? Number(v) : undefined)}>
              <SelectTrigger className="w-48"><SelectValue placeholder="角色筛选" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">全部角色</SelectItem>
                {roles.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setPage(1); refreshUsers() }}>查询</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>邮箱</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>最近登录</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell>{u.name || '-'}</TableCell>
                  <TableCell>{u.email || '-'}</TableCell>
                  <TableCell className="min-w-[160px]">
                    <Select value={u.role_id?.toString()} onValueChange={async (v) => {
                      try {
                        await setUserRole(u.id, Number(v))
                        await refreshUsers()
                      } catch (e) {
                        // 后端未上线：忽略错误
                      }
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {roles.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : '-'}</TableCell>
                  <TableCell className="space-x-2">
                    <Button variant="outline" size="sm" onClick={async () => {
                      try { await resetPassword(u.id) } catch (e) { console.error(e) }
                    }}>重置密码</Button>
                    <Button variant="outline" size="sm" onClick={async () => {
                      try { await toggleActive(u.id, !(u as any).active) } catch (e) { console.error(e) }
                    }}>{(u as any).active === false ? '启用' : '禁用'}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => { setPage(p => Math.max(1, p - 1)); refreshUsers() }}>上一页</Button>
            <span className="text-sm">{page} / {totalPages}</span>
            <Button variant="outline" disabled={page >= totalPages} onClick={() => { setPage(p => Math.min(totalPages, p + 1)); refreshUsers() }}>下一页</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}