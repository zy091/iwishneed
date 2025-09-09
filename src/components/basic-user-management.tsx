import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface User {
  id: string
  name: string
  role_id: number
  email?: string
  created_at: string
}

export const BasicUserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  // 获取当前用户信息
  const getCurrentUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      setCurrentUser(user)
      return user
    } catch (err: any) {
      console.error('获取当前用户失败:', err)
      setError(err.message)
      return null
    }
  }

  // 获取所有用户
  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // 先获取当前用户
      const user = await getCurrentUser()
      if (!user) {
        throw new Error('用户未登录')
      }

      // 查询 profiles 表
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, role_id, created_at')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // 查询 auth.users 表获取邮箱信息
      const { data: authUsers, error: authError } = await supabase
        .from('auth.users')
        .select('id, email')

      if (authError) {
        console.warn('无法获取邮箱信息:', authError)
      }

      // 合并数据
      const usersWithEmail = profiles?.map(profile => ({
        ...profile,
        email: authUsers?.find(au => au.id === profile.id)?.email || '未知'
      })) || []

      setUsers(usersWithEmail)
      
    } catch (err: any) {
      console.error('获取用户列表失败:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 更新用户角色
  const updateUserRole = async (userId: string, newRoleId: number) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role_id: newRoleId })
        .eq('id', userId)

      if (error) throw error

      // 刷新用户列表
      await fetchUsers()
      alert('用户角色更新成功！')
      
    } catch (err: any) {
      console.error('更新用户角色失败:', err)
      alert(`更新失败: ${err.message}`)
    }
  }

  // 角色名称映射
  const getRoleName = (roleId: number) => {
    switch (roleId) {
      case 0: return '超级管理员'
      case 1: return '管理员'
      case 2: return '普通用户'
      default: return '未知角色'
    }
  }

  // 角色颜色映射
  const getRoleColor = (roleId: number) => {
    switch (roleId) {
      case 0: return 'bg-red-100 text-red-800'
      case 1: return 'bg-blue-100 text-blue-800'
      case 2: return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">用户管理</h1>
        <p className="text-gray-600">管理系统用户和权限</p>
      </div>

      {/* 当前用户信息 */}
      {currentUser && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">当前登录用户</h2>
          <p className="text-blue-800">
            邮箱: {currentUser.email} | ID: {currentUser.id}
          </p>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="mb-6">
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? '加载中...' : '🔄 刷新用户列表'}
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>错误:</strong> {error}
        </div>
      )}

      {/* 用户列表 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                用户信息
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                角色
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
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {user.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {user.email}
                    </div>
                    <div className="text-xs text-gray-400">
                      ID: {user.id}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role_id)}`}>
                    {getRoleName(user.role_id)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleString('zh-CN')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <select
                    value={user.role_id}
                    onChange={(e) => updateUserRole(user.id, parseInt(e.target.value))}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    <option value={0}>超级管理员</option>
                    <option value={1}>管理员</option>
                    <option value={2}>普通用户</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500">
            暂无用户数据
          </div>
        )}
      </div>

      {/* 统计信息 */}
      {users.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">
              {users.length}
            </div>
            <div className="text-sm text-gray-500">总用户数</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-red-600">
              {users.filter(u => u.role_id === 0).length}
            </div>
            <div className="text-sm text-gray-500">超级管理员</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.role_id === 1).length}
            </div>
            <div className="text-sm text-gray-500">管理员</div>
          </div>
        </div>
      )}
    </div>
  )
}