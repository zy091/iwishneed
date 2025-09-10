import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  createUser,
  listRoles,
  listUsers,
  resetPassword,
  setUserRole,
  type Role,
  type UserRow,
} from '@/services/admin-service'
import { useAuth } from '@/hooks/useAuth'

export default function AdminUsersPage() {
  const { user, profile, isSuperAdmin, isAdmin } = useAuth()
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
  const [loading, setLoading] = useState(true)
  const [searchTrigger, setSearchTrigger] = useState(0)

  // Effect for roles
  useEffect(() => {
    listRoles()
      .then(fetchedRoles => {
        setRoles(fetchedRoles)
        if (roleId === undefined && fetchedRoles.length) {
          setRoleId(fetchedRoles.find(role => role.name === '开发者')?.id ?? fetchedRoles[0]?.id)
        }
      })
      .catch(e => {
        console.error('获取角色列表失败:', e)
        setError('无法加载角色列表。')
      })
  }, [roleId])

  // Effect for users
  useEffect(() => {
    const refreshUsers = async () => {
      setLoading(true);
      try {
        const { users: fetchedUsers, total: totalCount } = await listUsers({ page, pageSize, search, role_id: roleFilter });
        setUsers(fetchedUsers);
        setTotal(totalCount);
        setError('');
      } catch (e: any) {
        console.error('[AdminUsersPage] User fetch failed:', e);
        setError(`加载用户列表失败: ${e.message}。请检查您的网络连接和数据库权限。`);
      } finally {
        setLoading(false);
      }
    };

    refreshUsers();
  }, [page, pageSize, search, roleFilter, searchTrigger]);

  const handleCreateUser = async () => {
    setError('')
    try {
      if (!email || !password || roleId === undefined) throw new Error('请填写邮箱、密码并选择角色')
      await createUser({ email, password, name, role_id: roleId })
      setEmail(''); setPassword(''); setName('')
      if (page !== 1) {
        setPage(1)
      } else {
        setSearchTrigger(t => t + 1)
      }
    } catch (e: any) {
      setError(e.message || '创建失败')
    }
  }

  const handleSearch = () => {
    if (page !== 1) {
      setPage(1)
    } else {
      setSearchTrigger(t => t + 1)
    }
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize])

  if (!isSuperAdmin) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertTitle>无权访问</AlertTitle>
          <AlertDescription>您需要超级管理员权限才能访问此页面。</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>创建用户</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {error && <Alert>{error}</Alert>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input type="password" placeholder="密码（≥6位）" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Input placeholder="姓名（可选）" value={name} onChange={(e) => setName(e.target.value)} />
            <Select value={roleId?.toString() || ''} onValueChange={(v) => setRoleId(Number(v))}>
              <SelectTrigger><SelectValue placeholder="选择角色" /></SelectTrigger>
              <SelectContent>
                {roles.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreateUser}>创建</Button>
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
            <Button variant="outline" onClick={handleSearch}>查询</Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
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
                      <TableCell>{u.name || 'N/A'}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell className="min-w-[160px]">
                        <Select value={u.role_id?.toString()} onValueChange={async (v) => {
                          try {
                            await setUserRole(u.id, Number(v)) // u.id is now profile_id
                            setSearchTrigger(t => t + 1)
                          } catch (e) {
                            setError(`更新角色失败: ${e instanceof Error ? e.message : '未知错误'}`)
                          }
                        }}>
                          <SelectTrigger><SelectValue placeholder={u.role_name || '选择角色'} /></SelectTrigger>
                          <SelectContent>
                            {roles.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : '-'}</TableCell>
                      <TableCell className="space-x-2">
                        <Button variant="outline" size="sm" onClick={async () => {
                          try {
                            await resetPassword(u.user_id) // Use user_id for auth operations
                            alert('重置密码链接已发送')
                          } catch (e) {
                            setError(`重置密码失败: ${e instanceof Error ? e.message : '未知错误'}`)
                          }
                        }}>重置密码</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center gap-2">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</Button>
                <span className="text-sm">{page} / {totalPages}</span>
                <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>下一页</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}