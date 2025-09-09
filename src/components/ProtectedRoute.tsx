import { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import LoginForm from './LoginForm'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: ReactNode
  requireAdmin?: boolean
  requireSuperAdmin?: boolean
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  requireSuperAdmin = false 
}: ProtectedRouteProps) {
  const { user, profile, loading, isAdmin, isSuperAdmin } = useAuth()

  // 加载�?
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>加载�?..</p>
        </div>
      </div>
    )
  }

  // 未登�?
  if (!user || !profile) {
    return <LoginForm />
  }

  // 权限检�?
  if (requireSuperAdmin && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">权限不足</h1>
          <p className="text-gray-600">您需要超级管理员权限才能访问此页�?/p>
        </div>
      </div>
    )
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">权限不足</h1>
          <p className="text-gray-600">您需要管理员权限才能访问此页�?/p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default ProtectedRoute
