import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ENV } from '@/config/env'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

type Role = 'admin' | 'manager' | 'developer' | 'submitter'

function isAllowedOrigin(origin: string | null | undefined) {
  if (!origin) return false
  if (ENV.MAIN_APP_ORIGINS.length === 0) {
    // 未配置白名单时，默认拒绝（更安全）
    return false
  }
  return ENV.MAIN_APP_ORIGINS.includes(origin)
}

function isEmailAllowed(email: string | null | undefined) {
  if (!email) return false
  
  // 如果没有设置域名限制，则允许所有邮箱
  if (!ENV.ALLOWED_EMAIL_DOMAIN) return true
  
  // 支持多个域名（iwishweb.com 和 iwishcloud.com）
  const allowedDomains = ['iwishweb.com', 'iwishcloud.com']
  
  // 如果环境变量中设置了域名，也加入到允许列表
  const configDomain = ENV.ALLOWED_EMAIL_DOMAIN?.toLowerCase().trim()
  if (configDomain && !allowedDomains.includes(configDomain)) {
    allowedDomains.push(configDomain)
  }
  
  // 检查邮箱是否以任一允许的域名结尾
  const emailLower = email.toLowerCase()
  return allowedDomains.some(domain => emailLower.endsWith(`@${domain}`))
}

function b64UrlDecode(s: string) {
  // 转换回标准 Base64
  let t = s.replace(/-/g, '+').replace(/_/g, '/')
  while (t.length % 4) t += '='
  
  // 解码 Base64 并处理 UTF-8 字符
  try {
    // 方法一：使用 decodeURIComponent + escape
    const decoded1 = decodeURIComponent(escape(atob(t)))
    console.log('解码方法1结果:', decoded1)
    
    // 方法二：直接使用 TextDecoder
    const bytes = Uint8Array.from(atob(t), c => c.charCodeAt(0))
    const decoded2 = new TextDecoder('utf-8').decode(bytes)
    console.log('解码方法2结果:', decoded2)
    
    // 返回方法二的结果，通常更可靠处理 UTF-8
    return decoded2
  } catch (e) {
    console.error('Base64URL 解码失败:', e)
    throw e
  }
}

export default function Bridge() {
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const [status, setStatus] = useState('准备接入主项目会话...')
  const { setExternalUser } = useAuth()

  useEffect(() => {
    if (ENV.AUTH_MODE !== 'sso') {
      setStatus('非 SSO 模式，无需桥接，跳转首页')
      const t = setTimeout(() => navigate('/'), 800)
      return () => clearTimeout(t)
    }

    // 优先处理 external_user（Base64URL JSON）方案
    const externalUserParam = (search.get('external_user') || '').trim()
    if (externalUserParam) {
      try {
        const ref = document.referrer ? new URL(document.referrer).origin : null
        if (!isAllowedOrigin(ref)) {
          setStatus('来源未通过白名单校验，已拒绝')
          return
        }
        console.log('尝试解析 external_user 参数')
        const raw = b64UrlDecode(externalUserParam)
        console.log('解码后的原始数据:', raw)
        const data = JSON.parse(raw)
        console.log('解析后的用户数据:', data)
        
        // 调试用户名编码
        if (data.name) {
          console.log('用户名原始值:', data.name)
          console.log('用户名字节表示:', Array.from(new TextEncoder().encode(data.name)).map(b => b.toString(16)).join(' '))
        }

        const role: Role = (['admin', 'manager', 'developer', 'submitter'].includes(data.role)
          ? data.role
          : 'submitter') as Role

        const email = String(data.email || '')
        console.log('检查邮箱域名:', email)
        if (!isEmailAllowed(email)) {
          console.error('邮箱域名不符合要求:', email)
          setStatus(`邮箱域名不被允许：${email}`)
          return
        }
        console.log('邮箱域名校验通过')

        const u = {
          id: String(data.id || data.uid || data.user_id || email),
          name: String(data.name || data.full_name || (email ? email.split('@')[0] : '用户')),
          email,
          role,
          avatar: data.avatar || data.avatar_url || undefined,
        }

        console.log('设置外部用户:', u)
        setExternalUser(u)
        setStatus('会话已建立，跳转中...')
        console.log('跳转到首页')
        
        // 直接使用 window.location 进行跳转，避免 React Router 导航问题
        console.log('准备跳转到首页...')
        
        // 使用 setTimeout 确保状态更新和日志输出完成
        setTimeout(() => {
          console.log('执行跳转')
          // 直接使用 window.location.href 进行硬跳转
          window.location.href = window.location.origin + '/'
        }, 500)
        return
      } catch (e) {
        console.error('external_user 解析失败', e)
        setStatus('无法解析 external_user 参数')
      }
    }

    // 次选：IdP/OAuth（保留能力，当前场景一般不用）
    const idp = (search.get('idp') || ENV.SSO_PROVIDER || '').trim()
    const idToken = (search.get('id_token') || '').trim()

    const loginWithIdToken = async (provider: string, token: string) => {
      setStatus('正在使用 IdP 令牌建立会话...')
      const { error } = await supabase.auth.signInWithIdToken({
        provider: provider as any,
        token,
      })
      if (error) {
        console.error('signInWithIdToken error', error)
        setStatus(`使用 IdP 令牌登录失败：${error.message}`)
        return
      }
      setStatus('登录成功，跳转中...')
      navigate('/', { replace: true })
    }

    const startOAuth = async (provider: string) => {
      setStatus('跳转到 IdP 进行单点登录...')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: {
          redirectTo: `${window.location.origin}/auth/bridge`,
          queryParams: { prompt: 'none' },
        },
      })
      if (error) {
        console.error('signInWithOAuth error', error)
        setStatus(`发起 OAuth 登录失败：${error.message}`)
      }
    }

    if (idp) {
      if (idToken) {
        void loginWithIdToken(idp, idToken)
      } else {
        void startOAuth(idp)
      }
    } else {
      setStatus('等待主项目传递凭证...')
    }

    // postMessage 渠道
    const handler = (ev: MessageEvent) => {
      if (!isAllowedOrigin(ev.origin)) return
      const data = ev.data
      if (!data || typeof data !== 'object') return

      if (data.type === 'EXTERNAL_USER' && data.user) {
        try {
          const du = data.user
          const role: Role = (['admin', 'manager', 'developer', 'submitter'].includes(du.role)
            ? du.role
            : 'submitter') as Role
          const email = String(du.email || '')
          if (!isEmailAllowed(email)) {
            setStatus(`邮箱域名不被允许：${email}`)
            return
          }
          const u = {
            id: String(du.id || du.uid || du.user_id || email),
            name: String(du.name || du.full_name || (email ? email.split('@')[0] : '用户')),
            email,
            role,
            avatar: du.avatar || du.avatar_url || undefined,
          }
          setExternalUser(u)
          setStatus('会话已建立，跳转中...')
          
          // 直接使用 window.location 进行跳转
          setTimeout(() => {
            window.location.href = window.location.origin + '/'
          }, 500)
        } catch (e) {
          console.error('EXTERNAL_USER 处理失败', e)
          setStatus('处理主项目用户数据失败')
        }
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [navigate, search])

  // 添加强制跳转按钮
  const forceNavigate = () => {
    console.log('用户点击强制跳转')
    // 使用完整的 URL，包括协议和域名
    window.location.href = window.location.origin + '/'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white shadow rounded p-6 w-full max-w-md text-center">
        <h2 className="text-xl font-semibold mb-2">正在桥接主项目会话</h2>
        <p className="text-gray-600">{status}</p>
        
        {/* 添加手动跳转按钮 */}
        <button 
          onClick={forceNavigate}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          点击此处手动跳转到首页
        </button>
        {ENV.MAIN_APP_ORIGINS.length > 0 ? (
          <p className="text-xs text-gray-400 mt-3">
            允许来源：{ENV.MAIN_APP_ORIGINS.join(', ')}
          </p>
        ) : (
          <p className="text-xs text-rose-500 mt-3">未设置 VITE_MAIN_APP_ORIGINS，默认拒绝外部来源</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          邮箱域名限制：@iwishweb.com, @iwishcloud.com
          {ENV.ALLOWED_EMAIL_DOMAIN && ENV.ALLOWED_EMAIL_DOMAIN !== 'iwishweb.com' && ENV.ALLOWED_EMAIL_DOMAIN !== 'iwishcloud.com' && 
            `, @${ENV.ALLOWED_EMAIL_DOMAIN}`}
        </p>
      </div>
    </div>
  )
}