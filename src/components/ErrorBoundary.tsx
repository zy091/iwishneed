// 企业级需求管理系统 - 错误边界组件
// 提供全局错误捕获和用户友好的错误提示

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // 记录错误日志
    logger.error('React Error Boundary Caught Error', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      errorId: this.state.errorId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    })

    // 调用自定义错误处理函数
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleRefresh = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  handleReportError = () => {
    const { error, errorInfo, errorId } = this.state
    const errorReport = {
      errorId,
      error: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString()
    }

    // 这里可以集成错误报告系统，如 Sentry、Bugsnag 等
    logger.info('User reported error', errorReport)
    
    // 简单的邮件报告（实际项目中应该使用专业的错误报告服务）
    const subject = encodeURIComponent(`错误报告 - ${errorId}`)
    const body = encodeURIComponent(`
错误ID: ${errorId}
错误信息: ${error?.message}
发生时间: ${new Date().toLocaleString()}
页面地址: ${window.location.href}

请IT部门处理此错误。
    `)
    window.open(`mailto:it-support@company.com?subject=${subject}&body=${body}`)
  }

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认错误页面
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-xl text-gray-900">
                  页面出现错误
                </CardTitle>
                <CardDescription>
                  很抱歉，页面遇到了一个意外错误。我们已经记录了这个问题。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    错误ID: <code className="text-sm bg-gray-100 px-1 rounded">{this.state.errorId}</code>
                  </AlertDescription>
                </Alert>

                {import.meta.env.DEV && this.state.error && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-xs">
                      <strong>开发模式错误信息:</strong><br />
                      {this.state.error.message}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col space-y-2">
                  <Button onClick={this.handleRefresh} className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    刷新页面
                  </Button>
                  
                  <Button variant="outline" onClick={this.handleGoHome} className="w-full">
                    <Home className="w-4 h-4 mr-2" />
                    返回首页
                  </Button>
                  
                  <Button variant="ghost" onClick={this.handleReportError} className="w-full text-sm">
                    报告此错误
                  </Button>
                </div>

                <div className="text-center text-sm text-gray-500">
                  如果问题持续存在，请联系IT支持部门
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// 高阶组件，用于包装其他组件
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook 用于在函数组件中处理错误
export function useErrorHandler() {
  return (error: Error, errorInfo?: string) => {
    logger.error('Manual Error Report', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      additionalInfo: errorInfo,
      url: window.location.href,
      timestamp: new Date().toISOString()
    })
  }
}

export default ErrorBoundary