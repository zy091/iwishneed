import React from 'react'
import AuthDebug from '@/components/auth-debug'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AuthTestPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>认证状态测试页�?/CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            这个页面用于调试和测试用户认证状态。如果您遇到登录问题，可以使用这个页面来诊断问题�?
          </p>
        </CardContent>
      </Card>
      
      <AuthDebug />
    </div>
  )
}
