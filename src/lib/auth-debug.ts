// 认证调试工具
import { supabase } from './supabaseClient'

export const debugAuth = async () => {
  console.log('🔍 开始认证调试...')
  
  try {
    // 1. 检查客户端配置
    console.log('📋 Supabase 配置:')
    console.log('URL:', import.meta.env.VITE_SUPABASE_URL)
    console.log('Key:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
    
    // 2. 检查当前会话
    console.log('\n🔐 检查当前会话:')
    const { data: session, error: sessionError } = await supabase.auth.getSession()
    console.log('Session:', session)
    console.log('Session Error:', sessionError)
    
    // 3. 检查用户状态
    console.log('\n👤 检查用户状态:')
    const { data: user, error: userError } = await supabase.auth.getUser()
    console.log('User:', user)
    console.log('User Error:', userError)
    
    // 4. 尝试刷新会话
    console.log('\n🔄 尝试刷新会话:')
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
    console.log('Refresh Data:', refreshData)
    console.log('Refresh Error:', refreshError)
    
    // 5. 检查数据库连接
    console.log('\n🗄️ 检查数据库连接:')
    const { data: dbTest, error: dbError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    console.log('DB Test:', dbTest)
    console.log('DB Error:', dbError)
    
    // 6. 检查 RLS 策略
    console.log('\n🛡️ 检查 RLS 策略:')
    const { data: rpcTest, error: rpcError } = await supabase
      .rpc('get_current_user_id')
    console.log('RPC Test:', rpcTest)
    console.log('RPC Error:', rpcError)
    
  } catch (error) {
    console.error('❌ 调试过程中出错:', error)
  }
}

// 自动登录函数
export const autoLogin = async (email: string, password: string) => {
  console.log('🚀 尝试自动登录...')
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      console.error('❌ 登录失败:', error)
      return { success: false, error }
    }
    
    console.log('✅ 登录成功:', data)
    
    // 等待会话建立
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 再次检查会话
    const { data: session } = await supabase.auth.getSession()
    console.log('📋 登录后会话:', session)
    
    return { success: true, data }
    
  } catch (error) {
    console.error('❌ 登录过程中出错:', error)
    return { success: false, error }
  }
}

// 创建数据库函数来获取当前用户ID
export const createAuthFunctions = async () => {
  console.log('🔧 创建认证辅助函数...')
  
  const { data, error } = await supabase.rpc('create_auth_functions', {})
  
  if (error) {
    console.error('❌ 创建函数失败:', error)
  } else {
    console.log('✅ 函数创建成功')
  }
  
  return { data, error }
}