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
  const domain = ENV.ALLOWED_EMAIL_DOMAIN?.toLowerCase().trim()
  if (!domain) return true
  return email.toLowerCase().endsWith(`@${domain}`)
}

function b64UrlDecode(s: string) {
  let t = s.replace(/-/g, '+').replace(/_/g, '/')
  while (t.length % 4) t += '='
  return atob(t)
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
        navigate('/', { replace: true })
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
          navigate('/', { replace: true })
        } catch (e) {
          console.error('EXTERNAL_USER 处理失败', e)
          setStatus('处理主项目用户数据失败')
        }
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [navigate, search])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white shadow rounded p-6 w-full max-w-md text-center">
        <h2 className="text-xl font-semibold mb-2">正在桥接主项目会话</h2>
        <p className="text-gray-600">{status}</p>
        {ENV.MAIN_APP_ORIGINS.length > 0 ? (
          <p className="text-xs text-gray-400 mt-3">
            允许来源：{ENV.MAIN_APP_ORIGINS.join(', ')}
          </p>
        ) : (
          <p className="text-xs text-rose-500 mt-3">未设置 VITE_MAIN_APP_ORIGINS，默认拒绝外部来源</p>
        )}
        {ENV.ALLOWED_EMAIL_DOMAIN && (
          <p className="text-xs text-gray-400 mt-1">邮箱域名限制：@{ENV.ALLOWED_EMAIL_DOMAIN}</p>
        )}
      </div>
    </div>
  )
}