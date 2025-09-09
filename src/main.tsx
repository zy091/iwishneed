import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ThemeProvider } from './components/theme-provider'
import { AuthProvider } from './hooks/use-auth-fixed'
import ErrorBoundary from './components/ErrorBoundary'
import { logger } from './lib/logger'
import './globals.css'

// 一次性清理开关：仅清理需求数据，保留 SSO 用户缓存
if (import.meta.env.VITE_RESET_LOCAL_DATA === 'true') {
  try {
    localStorage.removeItem('requirements');
    logger.info('localStorage requirements cleared');
  } catch (e) {
    logger.warn('failed to clear requirements', e);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider defaultTheme="light" storageKey="requirement-system-theme">
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)