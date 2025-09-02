import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { getMainAccessToken } from '@/lib/mainAccessToken'

export default function CommentsDebug() {
  const [debugInfo, setDebugInfo] = useState<string>('')

  const checkDebugInfo = () => {
    const token = getMainAccessToken()
    const info = {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      authMode: import.meta.env.VITE_AUTH_MODE,
      origins: import.meta.env.VITE_MAIN_APP_ORIGINS,
      currentOrigin: window.location.origin,
    }
    setDebugInfo(JSON.stringify(info, null, 2))
  }

  const testCommentAPI = async () => {
    try {
      const token = getMainAccessToken()
      if (!token) {
        setDebugInfo('错误：缺少主访问令牌')
        return
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/comments-add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Main-Access-Token': token,
        },
        body: JSON.stringify({
          requirement_id: 'test-req-id',
          content: '测试评论',
        }),
      })

      const result = await response.text()
      setDebugInfo(`状态: ${response.status}\n响应: ${result}`)
    } catch (error) {
      setDebugInfo(`网络错误: ${error}`)
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-medium mb-2">评论功能调试</h3>
      <div className="space-x-2 mb-4">
        <Button onClick={checkDebugInfo} variant="outline" size="sm">
          检查配置
        </Button>
        <Button onClick={testCommentAPI} variant="outline" size="sm">
          测试API
        </Button>
      </div>
      {debugInfo && (
        <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
          {debugInfo}
        </pre>
      )}
    </div>
  )
}