import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import LoginForm from './LoginForm'
import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'

interface ProtectedRouteProps {
  children: ReactNode
  requireAdmin?: boolean
  requireSuperAdmin?: boolean
}

/**
 * 企业级路由保护组件
 * 提供完整的认证状态管理和错误处理
 */
export function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  requireSuperAdmin = false 
}: ProtectedRouteProps) {
  const { user, profile, loading, error, initialized, isAdmin, isSuperAdmin, clearError } = useAuth()

  // 认证初始化中
  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">正在加载</h2>
            <p className="text-sm text-gray-600">
              {!initialized ? '正在初始化认证系统...' : '正在验证用户身份...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 认证错误
  if (error && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-4">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">认证错误</h2>
          </div>
          
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>

          <div className="flex flex-col space-y-2">
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新页面
            </Button>
            <Button 
              onClick={clearError} 
              variant="ghost"
              className="w-full"
            >
              重试
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 未登录 - 显示登录表单
  if (!user || !profile) {
    return <LoginForm />
  }

  // 权限检查 - 超级管理员权限
  if (requireSuperAdmin && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-red-600">权限不足</h1>
            <p className="text-gray-600">
              您需要超级管理员权限才能访问此页面
            </p>
            <p className="text-sm text-gray-500">
              当前角色：{profile.role?.name || '未知'}
            </p>
          </div>
          <Button 
            onClick={() => window.history.back()} 
            variant="outline"
            className="w-full"
          >
            返回上一页
          </Button>
        </div>
      </div>
    )
  }

  // 权限检查 - 管理员权限
  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-orange-500 mx-auto" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-orange-600">权限不足</h1>
            <p className="text-gray-600">
              您需要管理员权限才能访问此页面
            </p>
            <p className="text-sm text-gray-500">
              当前角色：{profile.role?.name || '未知'}
            </p>
          </div>
          <Button 
            onClick={() => window.history.back()} 
            variant="outline"
            className="w-full"
          >
            返回上一页
          </Button>
        </div>
      </div>
    )
  }

  // 权限验证通过，渲染子组件
  return <>{children}</>
}

export default ProtectedRoute