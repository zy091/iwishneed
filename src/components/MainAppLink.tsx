import { useAuth } from '../hooks/use-auth'
import { Button } from './ui/button'

interface MainAppLinkProps {
  label?: string
  className?: string
}

/**
 * 主项目跳转到子项目的组件
 * 将当前登录用户信息编码后通过 URL 参数传递
 */
export function MainAppLink({ label = '跳转到需求管理系统', className }: MainAppLinkProps) {
  const { user } = useAuth()

  const handleClick = () => {
    if (!user) {
      console.error('用户未登录，无法跳转')
      return
    }

    // Base64URL 编码函数
    const toBase64Url = (json: any) => {
      const s = typeof json === 'string' ? json : JSON.stringify(json)
      return btoa(encodeURIComponent(s).replace(/%([0-9A-F]{2})/g, (_, p1) => 
        String.fromCharCode(parseInt(p1, 16))
      )).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    }

    // 构造用户信息载荷
    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'submitter',
      avatar: user.avatar
    }

    // 编码并跳转
    const encoded = toBase64Url(userPayload)
    
    // 开发环境
    window.location.href = `http://localhost:5173/auth/bridge?external_user=${encoded}`
    
    // 生产环境（取消注释并替换为实际域名）
    // window.location.href = `https://你的子项目域名/auth/bridge?external_user=${encoded}`
  }

  return (
    <Button 
      onClick={handleClick} 
      className={className}
    >
      {label}
    </Button>
  )
}