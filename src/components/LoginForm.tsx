import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useState, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Alert, AlertDescription } from './ui/alert'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'

/**
 * 企业级登录表单组件
 * 提供完整的用户体验和错误处理
 */
export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { signIn, error, clearError } = useAuth()

  // 处理表单提交
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    // 基本验证
    if (!email.trim() || !password) {
      return
    }

    try {
      setIsSubmitting(true)
      clearError() // 清除之前的错误
      
      await signIn(email.trim(), password)
      
      // 登录成功后的处理由 AuthProvider 自动完成
    } catch (err) {
      // 错误已经在 useAuth 中处理并设置到 error 状态
      console.error('[LoginForm] Sign in error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }, [email, password, signIn, clearError])

  // 处理输入变化时清除错误
  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (error) clearError()
  }, [error, clearError])

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (error) clearError()
  }, [error, clearError])

  // 切换密码显示状态
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev)
  }, [])

  // 表单验证
  const isFormValid = email.trim().length > 0 && password.length > 0
  const isSubmitDisabled = isSubmitting || !isFormValid

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold text-gray-900">
            IWISH需求管理系统
          </CardTitle>
          <CardDescription className="text-gray-600">
            请输入您的邮箱和密码登录系统
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 邮箱输入 */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                邮箱地址
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="请输入您的邮箱"
                value={email}
                onChange={handleEmailChange}
                required
                disabled={isSubmitting}
                className="h-11"
                autoComplete="email"
              />
            </div>

            {/* 密码输入 */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                密码
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入您的密码"
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  disabled={isSubmitting}
                  className="h-11 pr-10"
                  autoComplete="current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={togglePasswordVisibility}
                  disabled={isSubmitting}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <Alert variant="destructive" className="animate-in slide-in-from-top-1">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* 登录按钮 */}
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={isSubmitDisabled}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </Button>

            {/* 帮助信息 */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                如有登录问题，请联系系统管理员
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginForm