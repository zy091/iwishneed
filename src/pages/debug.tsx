import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DebugPage() {
  const [status, setStatus] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const checkSupabaseConnection = async () => {
    setLoading(true)
    const result: any = {}

    try {
      // 1. 检查环境变量
      result.env = {
        url: import.meta.env.VITE_SUPABASE_URL,
        hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
        anonKeyLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length
      }

      // 2. 检查 Supabase 客户端
      result.client = {
        supabaseUrl: supabase.supabaseUrl,
        supabaseKey: supabase.supabaseKey?.substring(0, 20) + '...'
      }

      // 3. 检查网络连接
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`, {
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          }
        })
        result.network = {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        }
      } catch (error: any) {
        result.network = {
          error: error.message
        }
      }

      // 4. 检查认证状态
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        result.auth = {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          email: session?.user?.email,
          error: error?.message
        }
      } catch (error: any) {
        result.auth = {
          error: error.message
        }
      }

      // 5. 测试数据库查询
      try {
        const { data, error } = await supabase.from('roles').select('*').limit(1)
        result.database = {
          success: !error,
          error: error?.message,
          hasData: !!data?.length
        }
      } catch (error: any) {
        result.database = {
          error: error.message
        }
      }

      // 6. 测试 Edge Function
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            result.edgeFunction = {
              status: response.status,
              ok: response.ok,
              statusText: response.statusText,
              data: data
            }
          } else {
            const errorText = await response.text()
            result.edgeFunction = {
              status: response.status,
              ok: response.ok,
              statusText: response.statusText,
              error: errorText
            }
          }
        } else {
          result.edgeFunction = {
            error: 'No access token available - 需要先登录'
          }
        }
      } catch (error: any) {
        result.edgeFunction = {
          error: error.message
        }
      }

    } catch (error: any) {
      result.error = error.message
    }

    setStatus(result)
    setLoading(false)
  }

  const testLogin = async () => {
    const email = prompt('请输入邮箱:')
    const password = prompt('请输入密码:')
    
    if (!email || !password) {
      alert('邮箱和密码不能为空')
      return
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        alert('登录失败: ' + error.message)
      } else {
        alert('登录成功!')
        checkSupabaseConnection()
      }
    } catch (error: any) {
      alert('登录错误: ' + error.message)
    }
  }

  useEffect(() => {
    checkSupabaseConnection()
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Supabase 连接诊断</h1>
        <div className="space-x-2">
          <Button onClick={checkSupabaseConnection} disabled={loading}>
            {loading ? '检查中...' : '重新检查'}
          </Button>
          <Button onClick={testLogin} variant="outline">
            测试登录
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>环境变量</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(status.env, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>客户端配置</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(status.client, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>网络连接</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(status.network, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>认证状态</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(status.auth, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>数据库查询</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(status.database, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Edge Function</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(status.edgeFunction, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>

      {status.error && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">全局错误</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-red-50 p-3 rounded overflow-auto text-red-800">
              {status.error}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}