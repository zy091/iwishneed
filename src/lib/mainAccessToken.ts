/**
 * 主项目访问令牌工具
 * 用于获取和管理从主项目传递过来的访问令牌
 */

/**
 * 获取存储的主项目访问令牌
 * @returns 访问令牌或空字符串（如果不存在）
 */
export function getMainAccessToken(): string {
  try {
    return sessionStorage.getItem('MAIN_ACCESS_TOKEN') || ''
  } catch (e) {
    console.error('获取主项目访问令牌失败:', e)
    return ''
  }
}

/**
 * 检查是否有主项目访问令牌
 * @returns 是否存在有效的访问令牌
 */
export function hasMainAccessToken(): boolean {
  return !!getMainAccessToken()
}

/**
 * 清除主项目访问令牌
 */
export function clearMainAccessToken(): void {
  try {
    sessionStorage.removeItem('MAIN_ACCESS_TOKEN')
  } catch (e) {
    console.error('清除主项目访问令牌失败:', e)
  }
}

/**
 * 为 fetch 请求添加主项目访问令牌头
 * @param options fetch 请求选项
 * @returns 添加了令牌头的请求选项
 */
export function withMainAccessToken(options: RequestInit = {}): RequestInit {
  const token = getMainAccessToken()
  if (!token) return options
  
  return {
    ...options,
    headers: {
      ...options.headers,
      'X-Main-Access-Token': token
    }
  }
}

/**
 * 为 URL 添加主项目访问令牌查询参数
 * @param url 原始 URL
 * @returns 添加了令牌参数的 URL
 */
export function urlWithMainAccessToken(url: string): string {
  const token = getMainAccessToken()
  if (!token) return url
  
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}main_access_token=${encodeURIComponent(token)}`
}

/**
 * 获取主项目访问令牌，如果不存在则抛出错误
 * @returns 访问令牌
 * @throws 如果令牌不存在或无效
 */
export function mustToken(): string {
  const token = getMainAccessToken()
  if (!token) {
    throw new Error('主项目访问令牌不存在，请从主系统登录')
  }
  return token
}
