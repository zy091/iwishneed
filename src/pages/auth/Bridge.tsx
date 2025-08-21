import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ENV } from '@/config/env'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

type Role = 'admin' | 'manager' | 'developer' | 'submitter'
type DebugInfo = {
  url: string
  ref: string
  allowed: string[]
  disable: boolean
  hasParam: boolean
  len: number
  nameLen: number
  hashLen: number
  opener: boolean
  channel: 'query' | 'window.name' | 'hash' | 'none'
}

function isAllowedOrigin(origin: string | null | undefined) {
  if (ENV.DISABLE_ORIGIN_CHECK) {
    console.warn('来源校验已禁用（联调模式）: 放行', origin)
    return true
  }

  // 调试信息
  console.log('检查来源:', origin)
  console.log('允许的来源列表:', ENV.MAIN_APP_ORIGINS)

  // 严格模式：来源缺失直接拒绝
  if (!origin) {
    console.warn('来源为空，严格模式下拒绝')
    return false
  }

  // 严格模式：白名单为空直接拒绝
  if (ENV.MAIN_APP_ORIGINS.length === 0) {
    console.warn('白名单为空，严格模式下拒绝')
    return false
  }

  // 规范化对比（去掉末尾斜杠）
  const isAllowed = ENV.MAIN_APP_ORIGINS.some((allowed) => {
    const a = allowed.replace(/\/$/, '')
    const o = origin.replace(/\/$/, '')
    return o === a
  })
  console.log('来源验证结果:', isAllowed, '来源:', origin, '白名单:', ENV.MAIN_APP_ORIGINS)
  return isAllowed
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
  const [debug, setDebug] = useState<DebugInfo | null>(null)
  const [shouldNavigate, setShouldNavigate] = useState(false)
  const { setExternalUser, isAuthenticated } = useAuth()

  // 监听认证状态变化，认证成功后自动跳转
  useEffect(() => {
    if (shouldNavigate && isAuthenticated) {
      console.log('认证状态已更新，执行跳转到首页')
      navigate('/', { replace: true })
    }
  }, [shouldNavigate, isAuthenticated, navigate])

  useEffect(() => {
    if (ENV.AUTH_MODE !== 'sso') {
      setStatus('非 SSO 模式，无需桥接，跳转首页')
      const t = setTimeout(() => navigate('/'), 800)
      return () => clearTimeout(t)
    }

    // 优先处理 external_user（Base64URL JSON）方案
    const externalUserParam = (search.get('external_user') || '').trim()

    // 兼容 window.name 透传方案（主项目设置 window.name = 'EXTERNAL_USER:<Base64Url>' 后跳转）
    let externalFromName = ''
    if (window.name && typeof window.name === 'string') {
      const wn = window.name
      if (wn.startsWith('EXTERNAL_USER:')) {
        externalFromName = wn.slice('EXTERNAL_USER:'.length).trim()
      }
    }

    // 兼容 Hash 透传方案（/#external_user=...&main_access_token=...）
    const externalFromHash = (() => {
      const h = window.location.hash || ''
      const m = h.match(/external_user=([^&]+)/)
      return m ? decodeURIComponent(m[1]) : ''
    })()
    
    // 获取主项目的 access_token（从 URL 参数或 Hash）
    const mainAccessToken = (() => {
      // 优先从 Hash 获取
      const h = window.location.hash || ''
      const mHash = h.match(/main_access_token=([^&]+)/)
      if (mHash) return decodeURIComponent(mHash[1])
      
      // 其次从查询参数获取
      const mQuery = search.get('main_access_token')
      return mQuery || ''
    })()

    const payloadParam = externalUserParam || externalFromName || externalFromHash
    const channel: 'query' | 'window.name' | 'hash' | 'none' =
      externalUserParam ? 'query' : (externalFromName ? 'window.name' : (externalFromHash ? 'hash' : 'none'))

    console.log('Bridge 启动，当前 URL:', window.location.href)
    console.log('external_user 参数存在:', !!externalUserParam, '长度:', externalUserParam.length)
    console.log('window.name 渠道长度:', externalFromName.length)
    console.log('hash 渠道长度:', externalFromHash.length, '使用通道:', channel)
    console.log('main_access_token 存在:', !!mainAccessToken, '长度:', mainAccessToken.length)
    
    // 如果有 main_access_token，安全存储在 sessionStorage（仅会话期有效）
    if (mainAccessToken) {
      try {
        sessionStorage.setItem('MAIN_ACCESS_TOKEN', mainAccessToken)
        console.log('已安全存储主项目访问令牌')
      } catch (e) {
        console.error('存储主项目访问令牌失败:', e)
      }
    }

    // 填充调试信息（直接显示在页面，避免依赖控制台）
    setDebug({
      url: window.location.href,
      ref: document.referrer || '',
      allowed: ENV.MAIN_APP_ORIGINS,
      disable: ENV.DISABLE_ORIGIN_CHECK,
      hasParam: !!payloadParam,
      len: payloadParam.length,
      nameLen: externalFromName.length,
      hashLen: externalFromHash.length,
      opener: !!window.opener,
      channel,
    })

    // 如无负载且存在 opener，则主动请求主项目发送凭证（兼容旧版本 postMessage 协议）
    let reqTimer: number | undefined
    if (!payloadParam && window.opener) {
      console.log('检测到 window.opener，向主项目请求凭证...')
      const sendReq = () => {
        try {
          window.opener?.postMessage?.({ type: 'REQUEST_EXTERNAL_USER' }, '*')
        } catch (e) {
          console.warn('向 opener 请求凭证失败:', e)
        }
      }
      sendReq()
      reqTimer = window.setInterval(sendReq, 800) // 重试请求
      setStatus('已向主项目请求凭证...')
    }
    console.log('Bridge 启动，当前 URL:', window.location.href)
    console.log('external_user 参数存在:', !!externalUserParam, '长度:', externalUserParam.length)
    if (payloadParam) {
      try {
        // 获取来源
        const ref = document.referrer ? new URL(document.referrer).origin : null
        console.log('请求来源:', ref)
        console.log('请求URL:', window.location.href)

        // 记录“返回主系统”地址：优先使用 referrer 的 origin，其次使用白名单首个
        try {
          const from = ref || null
          const fallback = (ENV.MAIN_APP_ORIGINS[0] || '').replace(/\/$/, '')
          const back = from ? from : (fallback || '')
          if (back) {
            sessionStorage.setItem('MAIN_APP_RETURN_URL', back + '/')
          }
        } catch (e) {
          console.warn('记录主系统返回地址失败:', e)
        }
        
        // 暂时跳过来源验证（用于调试）
        // if (!isAllowedOrigin(ref)) {
        //   setStatus('来源未通过白名单校验，已拒绝')
        //   return
        // }
        console.log('尝试解析 external_user 参数')
        const raw = b64UrlDecode(payloadParam)
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
        
        // 清理 window.name，避免泄漏
        try { window.name = '' } catch (_) {}
        
        // 如果有 main_access_token 但尚未存储，此时存储
        if (mainAccessToken && !sessionStorage.getItem('MAIN_ACCESS_TOKEN')) {
          try {
            sessionStorage.setItem('MAIN_ACCESS_TOKEN', mainAccessToken)
            console.log('已安全存储主项目访问令牌')
          } catch (e) {
            console.error('存储主项目访问令牌失败:', e)
          }
        }
        
        // 设置跳转标志，让 useEffect 监听认证状态变化后跳转
        setShouldNavigate(true)
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
          
          // 清理 window.name，避免泄漏
          try { window.name = '' } catch (_) {}
          
          // 如果消息中包含 main_access_token，存储它
          if (data.main_access_token && typeof data.main_access_token === 'string') {
            try {
              sessionStorage.setItem('MAIN_ACCESS_TOKEN', data.main_access_token)
              console.log('已从 postMessage 安全存储主项目访问令牌')
            } catch (e) {
              console.error('存储主项目访问令牌失败:', e)
            }
          }
          
          // 设置跳转标志，让 useEffect 监听认证状态变化后跳转
          setShouldNavigate(true)
        } catch (e) {
          console.error('EXTERNAL_USER 处理失败', e)
          setStatus('处理主项目用户数据失败')
        }
      }
    }

    window.addEventListener('message', handler)
    return () => {
      window.removeEventListener('message', handler)
      if (reqTimer) window.clearInterval(reqTimer)
    }
  }, [navigate, search])

  // 添加强制跳转与测试登录按钮
  const forceNavigate = () => {
    console.log('用户点击强制跳转')
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        const u = JSON.parse(stored)
        setExternalUser(u as any)
        setStatus('已恢复会话，跳转中...')
        setShouldNavigate(true)
        return
      }
    } catch (e) {
      console.warn('恢复本地会话失败:', e)
    }
    navigate('/', { replace: true })
  }

  const loginAsTestUser = () => {
    console.warn('联调模式：使用测试用户进入（仅用于测试）')
    const u = {
      id: 'debug_user',
      email: 'debug@iwishcloud.com',
      name: '联调测试',
      role: 'submitter' as Role,
      avatar: undefined,
    }
    setExternalUser(u as any)
    setStatus('联调模式：使用测试用户登录，跳转中...')
    setShouldNavigate(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white shadow rounded p-6 w-full max-w-md text-center">
        <h2 className="text-xl font-semibold mb-2">正在桥接主项目会话</h2>
        <p className="text-gray-600">{status}</p>
        {ENV.DISABLE_ORIGIN_CHECK && (
          <p className="text-xs text-amber-500 mt-2">已关闭来源校验（联调模式）</p>
        )}
        
        {/* 手动跳转按钮（在已建立会话时有效） */}
        <button 
          onClick={forceNavigate}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          手动跳转到首页
        </button>

        {/* 联调辅助：无凭证时可用测试用户一键进入 */}
        {ENV.DISABLE_ORIGIN_CHECK && !(debug?.hasParam) && (
          <button
            onClick={loginAsTestUser}
            className="mt-2 ml-2 px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
          >
            使用测试用户进入
          </button>
        )}
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

        {/* 调试信息面板（只读显示，便于定位 external_user/来源问题） */}
        <div className="mt-4 text-left text-xs text-gray-500 bg-gray-50 border rounded p-3 space-y-1">
          <div>联调模式（禁用来源校验）：{ENV.DISABLE_ORIGIN_CHECK ? '已开启' : '关闭'}</div>
          {debug && (
            <>
              <div>当前URL：<span className="break-all">{debug.url}</span></div>
              <div>Referrer：<span className="break-all">{debug.ref || '(空)'}</span></div>
              <div>白名单：{debug.allowed.length > 0 ? debug.allowed.join(', ') : '(空)'}</div>
              <div>通道：{debug.channel}；external_user：{debug.hasParam ? '是' : '否'}（有效负载长度：{debug.len}，window.name 长度：{debug.nameLen}，hash 长度：{debug.hashLen}，opener：{debug.opener ? '存在' : '不存在'}）</div>
              <div>主项目访问令牌：{!!mainAccessToken ? '已接收' : '未接收'}{!!sessionStorage.getItem('MAIN_ACCESS_TOKEN') ? '（已存储）' : ''}</div>
              {!debug.hasParam && <div className="text-amber-600">提示：未检测到 external_user 参数。请确认主项目跳转 URL 是否携带 external_user=...</div>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}