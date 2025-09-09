import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

export const SimpleTest: React.FC = () => {
  const [testResults, setTestResults] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const runBasicTests = async () => {
    setLoading(true)
    const results: any = {}

    try {
      // 1. 测试基础连接
      console.log('🔍 测试 1: 基础数据库连接')
      const { data: basicTest, error: basicError } = await supabase
        .from('profiles')
        .select('id, name, role_id')
        .limit(1)
      
      results.basicConnection = {
        success: !basicError,
        data: basicTest,
        error: basicError?.message
      }
      console.log('基础连接结果:', results.basicConnection)

      // 2. 测试认证状态
      console.log('🔍 测试 2: 认证状态')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      results.authSession = {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        error: sessionError?.message
      }
      console.log('认证状态结果:', results.authSession)

      // 3. 测试用户查询
      console.log('🔍 测试 3: 用户查询')
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      results.authUser = {
        hasUser: !!user,
        userId: user?.id,
        email: user?.email,
        error: userError?.message
      }
      console.log('用户查询结果:', results.authUser)

      // 4. 测试直接 SQL 查询
      console.log('🔍 测试 4: 直接 SQL 查询')
      const { data: sqlTest, error: sqlError } = await supabase.rpc('get_current_user_id')
      results.sqlTest = {
        success: !sqlError,
        userId: sqlTest,
        error: sqlError?.message
      }
      console.log('SQL 查询结果:', results.sqlTest)

    } catch (error: any) {
      console.error('测试过程中出错:', error)
      results.globalError = error.message
    }

    setTestResults(results)
    setLoading(false)
  }

  const testLogin = async () => {
    console.log('🚀 测试登录功能')
    const email = 'lin88@iwishweb.com'
    const password = prompt('请输入密码:')
    
    if (!password) return

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        alert(`登录失败: ${error.message}`)
        console.error('登录错误:', error)
      } else {
        alert('登录成功！')
        console.log('登录成功:', data)
        // 重新运行测试
        setTimeout(runBasicTests, 1000)
      }
    } catch (error: any) {
      alert(`登录异常: ${error.message}`)
      console.error('登录异常:', error)
    }
  }

  useEffect(() => {
    runBasicTests()
  }, [])

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg p-4 max-w-md shadow-lg z-50">
      <h3 className="text-lg font-bold text-gray-800 mb-3">🧪 基础连接测试</h3>
      
      <div className="space-y-2 mb-4">
        <button
          onClick={runBasicTests}
          disabled={loading}
          className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? '测试中...' : '🔄 重新测试'}
        </button>
        
        <button
          onClick={testLogin}
          className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          🔑 测试登录
        </button>
      </div>

      <div className="text-xs space-y-2">
        <div className={`p-2 rounded ${testResults.basicConnection?.success ? 'bg-green-100' : 'bg-red-100'}`}>
          <strong>数据库连接:</strong> {testResults.basicConnection?.success ? '✅ 成功' : '❌ 失败'}
          {testResults.basicConnection?.error && (
            <div className="text-red-600 mt-1">{testResults.basicConnection.error}</div>
          )}
        </div>

        <div className={`p-2 rounded ${testResults.authSession?.hasSession ? 'bg-green-100' : 'bg-red-100'}`}>
          <strong>认证会话:</strong> {testResults.authSession?.hasSession ? '✅ 存在' : '❌ 不存在'}
          {testResults.authSession?.email && (
            <div className="text-green-600 mt-1">用户: {testResults.authSession.email}</div>
          )}
        </div>

        <div className={`p-2 rounded ${testResults.authUser?.hasUser ? 'bg-green-100' : 'bg-red-100'}`}>
          <strong>用户状态:</strong> {testResults.authUser?.hasUser ? '✅ 已登录' : '❌ 未登录'}
        </div>

        <div className={`p-2 rounded ${testResults.sqlTest?.success ? 'bg-green-100' : 'bg-red-100'}`}>
          <strong>SQL 函数:</strong> {testResults.sqlTest?.success ? '✅ 正常' : '❌ 异常'}
          {testResults.sqlTest?.error && (
            <div className="text-red-600 mt-1">{testResults.sqlTest.error}</div>
          )}
        </div>
      </div>

      {testResults.globalError && (
        <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-600">
          <strong>全局错误:</strong> {testResults.globalError}
        </div>
      )}
    </div>
  )
}