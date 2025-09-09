import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, User, Database, AlertCircle, CheckCircle } from 'lucide-react'

export default function AuthDebug() {
  const { user, isAuthenticated } = useAuth()
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [profileInfo, setProfileInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkAuthStatus = async () => {
    setLoading(true)
    try {
      // 检查会话
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      setSessionInfo({ session, error: sessionError })

      // 检查用户档案
      if (session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        setProfileInfo({ profile, error: profileError })
      }
    } catch (error) {
      console.error('检查认证状态失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const forceRefreshAuth = async () => {
    setLoading(true)
    try {
      // 强制刷新会话
      const { data, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error('刷新会话失败:', error)
      } else {
        console.log('会话刷新成功:', data)
        await checkAuthStatus()
      }
    } catch (error) {
      console.error('强制刷新失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="mb-6 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            认证状态调试
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={checkAuthStatus}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            刷新状态
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 前端认证状态 */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center mb-2">
            <Database className="w-4 h-4 mr-2" />
            <span className="font-medium">前端认证状态</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <span className="w-20">登录状态:</span>
              <Badge variant={isAuthenticated ? "default" : "destructive"}>
                {isAuthenticated ? "已登录" : "未登录"}
              </Badge>
            </div>
            {user && (
              <>
                <div className="flex items-center">
                  <span className="w-20">用户ID:</span>
                  <code className="text-xs bg-gray-200 px-1 rounded">{user.id}</code>
                </div>
                <div className="flex items-center">
                  <span className="w-20">用户名:</span>
                  <span>{user.name}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-20">邮箱:</span>
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-20">角色:</span>
                  <Badge variant="secondary">{user.rolename || user.role}</Badge>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Supabase 会话状态 */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center mb-2">
            <CheckCircle className="w-4 h-4 mr-2" />
            <span className="font-medium">Supabase 会话状态</span>
          </div>
          <div className="space-y-2 text-sm">
            {sessionInfo ? (
              <>
                <div className="flex items-center">
                  <span className="w-20">会话状态:</span>
                  <Badge variant={sessionInfo.session ? "default" : "destructive"}>
                    {sessionInfo.session ? "有效" : "无效"}
                  </Badge>
                </div>
                {sessionInfo.session?.user && (
                  <>
                    <div className="flex items-center">
                      <span className="w-20">用户ID:</span>
                      <code className="text-xs bg-gray-200 px-1 rounded">
                        {sessionInfo.session.user.id}
                      </code>
                    </div>
                    <div className="flex items-center">
                      <span className="w-20">邮箱:</span>
                      <span>{sessionInfo.session.user.email}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-20">令牌过期:</span>
                      <span>{new Date(sessionInfo.session.expires_at * 1000).toLocaleString()}</span>
                    </div>
                  </>
                )}
                {sessionInfo.error && (
                  <div className="flex items-center text-red-600">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    <span>错误: {sessionInfo.error.message}</span>
                  </div>
                )}
              </>
            ) : (
              <span className="text-gray-500">正在检查...</span>
            )}
          </div>
        </div>

        {/* 用户档案状态 */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center mb-2">
            <User className="w-4 h-4 mr-2" />
            <span className="font-medium">用户档案状态</span>
          </div>
          <div className="space-y-2 text-sm">
            {profileInfo ? (
              <>
                {profileInfo.profile ? (
                  <>
                    <div className="flex items-center">
                      <span className="w-20">档案状态:</span>
                      <Badge variant="default">存在</Badge>
                    </div>
                    <div className="flex items-center">
                      <span className="w-20">姓名:</span>
                      <span>{profileInfo.profile.name}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-20">角色ID:</span>
                      <Badge variant="secondary">{profileInfo.profile.role_id}</Badge>
                    </div>
                    <div className="flex items-center">
                      <span className="w-20">创建时间:</span>
                      <span>{new Date(profileInfo.profile.created_at).toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center text-red-600">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    <span>用户档案不存在</span>
                  </div>
                )}
                {profileInfo.error && (
                  <div className="flex items-center text-red-600">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    <span>错误: {profileInfo.error.message}</span>
                  </div>
                )}
              </>
            ) : (
              <span className="text-gray-500">正在检查...</span>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            onClick={forceRefreshAuth}
            disabled={loading}
          >
            强制刷新会话
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => window.location.reload()}
          >
            刷新页面
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}