import React, { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { debugAuth, autoLogin } from '@/lib/auth-debug'

export const EmergencyLogin: React.FC = () => {
  const [email, setEmail] = useState('lin88@iwishweb.com')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  const handleDebug = async () => {
    setLoading(true)
    try {
      await debugAuth()
      
      // 获取调试信息
      const { data: userInfo, error } = await supabase.rpc('get_user_info')
      setDebugInfo({ userInfo, error })
      
    } catch (error) {
      console.error('调试失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!password) {
      alert('请输入密码')
      return
    }
    
    setLoading(true)
    try {
      const result = await autoLogin(email, password)
      
      if (result.success) {
        alert('登录成功！页面将刷新')
        window.location.reload()
      } else {
        alert(`登录失败: ${result.error?.message}`)
      }
      
    } catch (error) {
      console.error('登录失败:', error)
      alert('登录过程中出错')
    } finally {
      setLoading(false)
    }
  }

  const handleForceSession = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('force_create_session', {
        user_email: email
      })
      
      console.log('强制会话结果:', { data, error })
      setDebugInfo({ forceSession: { data, error } })
      
    } catch (error) {
      console.error('强制会话失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed top-4 right-4 bg-red-100 border border-red-400 rounded-lg p-4 max-w-md z-50">
      <h3 className="text-lg font-bold text-red-800 mb-3">🚨 紧急登录调试</h3>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">邮箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="输入密码进行登录"
          />
        </div>
        
        <div className="flex flex-col space-y-2">
          <button
            onClick={handleDebug}
            disabled={loading}
            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '调试中...' : '🔍 调试认证状态'}
          </button>
          
          <button
            onClick={handleLogin}
            disabled={loading || !password}
            className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? '登录中...' : '🚀 紧急登录'}
          </button>
          
          <button
            onClick={handleForceSession}
            disabled={loading}
            className="px-3 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
          >
            {loading ? '检查中...' : '🔧 检查用户信息'}
          </button>
        </div>
      </div>
      
      {debugInfo && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}
      
      <div className="mt-3 text-xs text-gray-600">
        <p>💡 使用步骤:</p>
        <p>1. 点击"调试认证状态"查看问题</p>
        <p>2. 输入密码后点击"紧急登录"</p>
        <p>3. 登录成功后页面会自动刷新</p>
      </div>
    </div>
  )
}