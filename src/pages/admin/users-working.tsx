import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { listUsers, listRoles, createUser, setUserRole, resetPassword, deleteUser, type UserRow, type Role } from '@/services/admin-service'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, UserPlus, Shield, ShieldCheck, RotateCcw } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function AdminUsersWorkingPage() {
  const { isSuperAdmin } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserRow[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  
  // 创建用户表单状态
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    name: '',
    role_id: 3 // 默认普通用户
  })
  const [creating, setCreating] = useState(false)

  // 加载数据
  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      
      // 加载角色列表
      const rolesData = await listRoles()
      setRoles(rolesData)
      
      // 加载用户列表
      const { users: usersData } = await listUsers({ page: 1, pageSize: 100 })
      setUsers(usersData)
      
    } catch (err) {
      console.error('加载数据失败:', err)
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSuperAdmin) {
      loadData()
    } else {
      setLoading(false)
    }
  }, [isSuperAdmin])

  // 创建用户
  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.password) {
      toast({
        title: '表单验证失败',
        description: '请填写邮箱和密码',
        variant: 'destructive'
      })
      return
    }

    try {
      setCreating(true)
      await createUser({
        email: createForm.email,
        password: createForm.password,
        name: createForm.name,
        role_id: createForm.role_id
      })
      
      toast({
        title: '创建成功',
        description: `用户 ${createForm.email} 已创建`
      })
      
      // 重置表单
      setCreateForm({
        email: '',
        password: '',
        name: '',
        role_id: 3
      })
      
      // 重新加载用户列表
      await loadData()
      
    } catch (err) {
      toast({
        title: '创建失败',
        description: err instanceof Error ? err.message : '创建用户失败',
        variant: 'destructive'
      })
    } finally {
      setCreating(false)
    }
  }

  // 更新用户角色
  const handleUpdateRole = async (userId: string, newRoleId: number) => {
    try {
      await setUserRole(userId, newRoleId)
      toast({
        title: '角色更新成功',
        description: '用户角色已更新'
      })
      await loadData()
    } catch (err) {
      toast({
        title: '角色更新失败',
        description: err instanceof Error ? err.message : '更新失败',
        variant: 'destructive'
      })
    }
  }

  // 重置密码
  const handleResetPassword = async (userId: string, userEmail: string) => {
    try {
      await resetPassword(userId)
      toast({
        title: '密码重置成功',
        description: `重置密码链接已发送到 ${userEmail}`
      })
    } catch (err) {
      toast({
        title: '密码重置失败',
        description: err instanceof Error ? err.message : '重置失败',
        variant: 'destructive'
      })
    }
  }

  // 删除用户
  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`确定要删除用户 ${userEmail} 吗？此操作不可撤销。`)) {
      return
    }

    try {
      await deleteUser(userId)
      toast({
        title: '删除成功',
        description: `用户 ${userEmail} 已删除`
      })
      await loadData()
    } catch (err) {
      toast({
        title: '删除失败',
        description: err instanceof Error ? err.message : '删除失败',
        variant: 'destructive'
      })
    }
  }

  // 获取角色名称
  const getRoleName = (roleId: number) => {
    const role = roles.find(r => r.id === roleId)
    return role?.name || '未知角色'
  }

  // 获取角色颜色
  const getRoleColor = (roleId: number) => {
    switch (roleId) {
      case 0: return 'bg-red-100 text-red-800'
      case 1: return 'bg-blue-100 text-blue-800'
      case 2: return 'bg-green-100 text-green-800'
      case 3: return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

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

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <Button onClick={loadData} disabled={loading}>
          {loading ? '加载中...' : '刷新'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 创建用户表单 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            创建新用户
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="邮箱地址"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
            />
            <Input
              placeholder="密码 (≥6位)"
              type="password"
              value={createForm.password}
              onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
            />
            <Input
              placeholder="姓名 (可选)"
              value={createForm.name}
              onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
            />
            <Select
              value={createForm.role_id.toString()}
              onValueChange={(value) => setCreateForm(prev => ({ ...prev, role_id: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-4">
            <Button onClick={handleCreateUser} disabled={creating}>
              {creating ? '创建中...' : '创建用户'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 用户列表 */}
      <Card>
        <CardHeader>
          <CardTitle>用户列表 ({users.length} 个用户)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    角色权限
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      暂无用户数据
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.name || '未设置'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Select
                          value={user.role_id.toString()}
                          onValueChange={(value) => handleUpdateRole(user.id, parseInt(value))}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role_id)}`}>
                                {user.role_name}
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={role.id.toString()}>
                                <div className="flex items-center gap-2">
                                  {role.id === 0 && <Shield className="h-4 w-4 text-red-500" />}
                                  {role.id === 1 && <ShieldCheck className="h-4 w-4 text-blue-500" />}
                                  {role.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResetPassword(user.user_id, user.email)}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            重置密码
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.user_id, user.email)}
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 角色说明 */}
      <Card>
        <CardHeader>
          <CardTitle>角色权限说明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {roles.map((role) => (
              <div key={role.id} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {role.id === 0 && <Shield className="h-4 w-4 text-red-500" />}
                  {role.id === 1 && <ShieldCheck className="h-4 w-4 text-blue-500" />}
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(role.id)}`}>
                    {role.name}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {role.id === 0 && '拥有所有权限，可管理用户和系统'}
                  {role.id === 1 && '管理员权限，可管理需求和用户'}
                  {role.id === 2 && '经理权限，可审核和分配需求'}
                  {role.id === 3 && '开发者权限，可处理分配的需求'}
                  {role.id === 4 && '提交者权限，可提交和查看需求'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}