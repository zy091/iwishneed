// 企业级需求管理系统 - 统一日志工具
// 提供统一的日志管理，支持开发和生产环境的不同配置

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogConfig {
  level: LogLevel
  enableConsole: boolean
  enableRemote: boolean
  remoteEndpoint?: string
}

class Logger {
  private config: LogConfig
  private isDevelopment: boolean

  constructor() {
    this.isDevelopment = import.meta.env.DEV
    this.config = {
      level: this.isDevelopment ? 'debug' : 'warn',
      enableConsole: this.isDevelopment,
      enableRemote: !this.isDevelopment,
      remoteEndpoint: import.meta.env.VITE_LOG_ENDPOINT
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    }
    return levels[level] >= levels[this.config.level]
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data)}`
    }
    return `${prefix} ${message}`
  }

  private async sendToRemote(level: LogLevel, message: string, data?: any) {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) {
      return
    }

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          level,
          message,
          data,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      })
    } catch (error) {
      // 静默失败，避免日志系统影响主业务
    }
  }

  debug(message: string, data?: any) {
    if (!this.shouldLog('debug')) return

    if (this.config.enableConsole) {
      console.debug(this.formatMessage('debug', message, data))
    }
    this.sendToRemote('debug', message, data)
  }

  info(message: string, data?: any) {
    if (!this.shouldLog('info')) return

    if (this.config.enableConsole) {
      console.info(this.formatMessage('info', message, data))
    }
    this.sendToRemote('info', message, data)
  }

  warn(message: string, data?: any) {
    if (!this.shouldLog('warn')) return

    if (this.config.enableConsole) {
      console.warn(this.formatMessage('warn', message, data))
    }
    this.sendToRemote('warn', message, data)
  }

  error(message: string, error?: Error | any) {
    if (!this.shouldLog('error')) return

    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error

    if (this.config.enableConsole) {
      console.error(this.formatMessage('error', message, errorData))
    }
    this.sendToRemote('error', message, errorData)
  }

  // 性能监控
  time(label: string) {
    if (this.isDevelopment) {
      console.time(label)
    }
  }

  timeEnd(label: string) {
    if (this.isDevelopment) {
      console.timeEnd(label)
    }
  }

  // 用户行为追踪
  track(event: string, properties?: Record<string, any>) {
    this.info(`User Event: ${event}`, properties)
  }

  // 更新配置
  updateConfig(newConfig: Partial<LogConfig>) {
    this.config = { ...this.config, ...newConfig }
  }
}

// 创建全局日志实例
export const logger = new Logger()

// Alias for compatibility with existing imports expecting `Logger`
export { logger as Logger }

// 便捷的导出函数
export const log = {
  debug: (message: string, data?: any) => logger.debug(message, data),
  info: (message: string, data?: any) => logger.info(message, data),
  warn: (message: string, data?: any) => logger.warn(message, data),
  error: (message: string, error?: Error | any) => logger.error(message, error),
  time: (label: string) => logger.time(label),
  timeEnd: (label: string) => logger.timeEnd(label),
  track: (event: string, properties?: Record<string, any>) => logger.track(event, properties)
}

// 全局错误处理
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.error('Global Error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled Promise Rejection', {
      reason: event.reason
    })
  })
}

