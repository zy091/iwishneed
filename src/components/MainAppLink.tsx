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

    // Base64URL 编码函数，支持中文
    const toBase64Url = (json: any) => {
      const s = typeof json === 'string' ? json : JSON.stringify(json)
      
      // 使用 TextEncoder 处理 UTF-8 字符（更可靠的方法）
      try {
        // 方法1: 使用 encodeURIComponent + unescape
        const encoded1 = btoa(unescape(encodeURIComponent(s)))
        console.log('编码方法1结果:', encoded1)
        
        // 方法2: 使用 TextEncoder（更现代的方法）
        const bytes = new TextEncoder().encode(s)
        let binary = ''
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        const encoded2 = btoa(binary)
        console.log('编码方法2结果:', encoded2)
        
        // 转换为 Base64URL 格式（使用方法1的结果）
        return encoded1.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      } catch (e) {
        console.error('编码失败:', e)
        // 降级处理，尝试不处理中文直接编码
        return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      }
    }

    // 构造用户信息载荷
    const userPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'submitter',
      avatar: user.avatar
    }

    console.log('准备编码的用户信息:', userPayload)
    
    // 编码并跳转
    const encoded = toBase64Url(userPayload)
    console.log('编码后的用户信息:', encoded)

    // 开发环境
    window.location.href = `http://localhost:5173/auth/bridge?external_user=${encoded}`

    // 生产环境（取消注释并替换为实际域名）
    // window.location.href = `https://iwishneed.netlify.app/auth/bridge?external_user=${encoded}`
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
