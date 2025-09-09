import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, LogIn, RefreshCw } from 'lucide-react'

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  const checkAuth = async () => {
    try {
      setIsLoading(true)
      
      // 检查当前会�?
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('认证检查失�?', error)
        setIsAuthenticated(false)
        return
      }

      if (session?.user) {
        console.log('用户已登�?', session.user.email)
        setIsAuthenticated(true)
      } else {
        console.log('用户未登�?)
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('认证检查异�?', error)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()

    // 监听认证状态变�?
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('认证状态变�?', event, session?.user?.email)
      
      if (event === 'SIGNED_IN' && session?.user) {
        setIsAuthenticated(true)
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 重定向到登录页面
  const redirectToLogin = () => {
    // 保存当前路径，登录后可以返回
    const returnUrl = encodeURIComponent(location.pathname + location.search)
    navigate(`/login?returnUrl=${returnUrl}`)
  }

  // 加载中状�?
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
            <h2 className="text-lg font-semibold mb-2">验证登录状�?/h2>
            <p className="text-gray-600">正在检查您的登录状态，请稍�?..</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 未认证状�?
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-600" />
            <h2 className="text-xl font-semibold mb-4">需要登�?/h2>
            <p className="text-gray-600 mb-6">
              您需要登录才能访问需求管理系统。请点击下方按钮前往登录页面�?
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={redirectToLogin}
                className="w-full"
                size="lg"
              >
                <LogIn className="w-4 h-4 mr-2" />
                前往登录
              </Button>
              
              <Button 
                onClick={checkAuth}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                重新检�?
              </Button>
            </div>
            
            <div className="mt-6 text-sm text-gray-500">
              <p>如果您已经登录但仍看到此页面，请尝试�?/p>
              <ul className="mt-2 space-y-1">
                <li>�?刷新页面</li>
                <li>�?清除浏览器缓�?/li>
                <li>�?重新登录</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 已认证，渲染子组�?
  return <>{children}</>
}
