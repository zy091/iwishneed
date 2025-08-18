import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ThemeProvider } from './components/theme-provider'
import { AuthProvider } from './hooks/use-auth'
import './globals.css'

// 一次性清理开关：仅清理需求数据，保留 SSO 用户缓存
if (import.meta.env.VITE_RESET_LOCAL_DATA === 'true') {
  try {
    localStorage.removeItem('requirements');
    console.info('[RESET] localStorage requirements cleared');
  } catch (e) {
    console.warn('[RESET] failed to clear requirements', e);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider defaultTheme="light" storageKey="requirement-system-theme">
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)