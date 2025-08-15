import { useState, useEffect } from 'react'

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // 初始检查
    checkIfMobile()
    
    // 监听窗口大小变化
    window.addEventListener('resize', checkIfMobile)
    
    // 清理函数
    return () => {
      window.removeEventListener('resize', checkIfMobile)
    }
  }, [])

  // 检查是否为移动设备
  const checkIfMobile = () => {
    setIsMobile(window.innerWidth < 768)
  }

  return isMobile
}