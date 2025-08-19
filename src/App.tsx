import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/use-auth'
import Layout from './layout'
import Login from './pages/login'
import Dashboard from './pages/dashboard'
import TechRequirementList from './pages/tech-requirement-list'
import TechRequirementForm from './pages/tech-requirement-form'
import TechRequirementImport from './pages/tech-requirement-import'
import CreativeRequirementList from './pages/creative-requirement-list'
import CreativeRequirementForm from './pages/creative-requirement-form'
import RequirementImport from './pages/requirement-import'
import AuthBridge from './pages/auth/Bridge'
import { ENV } from './config/env'

function App() {
  const { isAuthenticated } = useAuth()

  // SSO 模式下，如果未认证则跳转到桥接页
  if (ENV.AUTH_MODE === 'sso' && !isAuthenticated) {
    return (
      <Routes>
        <Route path="/auth/bridge" element={<AuthBridge />} />
        <Route path="*" element={<Navigate to="/auth/bridge" replace />} />
      </Routes>
    )
  }

  // 独立模式下，如果未认证则跳转到登录页
  if (ENV.AUTH_MODE === 'standalone' && !isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* 仪表盘 */}
        <Route index element={<Dashboard />} />

        {/* 技术部需求（仅保留这部分功能） */}
        <Route path="departments/tech" element={<TechRequirementList />} />
        <Route path="tech-requirements/new" element={<TechRequirementForm />} />
        <Route path="tech-requirements/:id" element={<TechRequirementForm />} />
        <Route path="tech-requirements/:id/edit" element={<TechRequirementForm />} />
        <Route path="tech-requirements/import" element={<TechRequirementImport />} />
        {/* 创意部需求 */}
        <Route path="departments/creative" element={<CreativeRequirementList />} />
        <Route path="creative-requirements/new" element={<CreativeRequirementForm />} />
        <Route path="creative-requirements/:id" element={<CreativeRequirementForm />} />
        <Route path="creative-requirements/:id/edit" element={<CreativeRequirementForm />} />
        {/* 通用导入（用于创意部） */}
        <Route path="requirements/import" element={<RequirementImport />} />

        {/* 兼容/占位重定向，避免旧入口 404 */}
        <Route path="requirements/*" element={<Navigate to="/departments/tech" replace />} />
        <Route path="departments" element={<Navigate to="/departments/tech" replace />} />
        <Route path="tech/requirements" element={<Navigate to="/departments/tech" replace />} />
        <Route path="tech/requirements/new" element={<Navigate to="/tech-requirements/new" replace />} />
        <Route path="tech/requirements/import" element={<Navigate to="/tech-requirements/import" replace />} />
        <Route path="reports" element={<Navigate to="/" replace />} />
        <Route path="analytics" element={<Navigate to="/" replace />} />
        <Route path="database-management" element={<Navigate to="/" replace />} />
      </Route>

      {/* 其他路由 */}
      {ENV.AUTH_MODE === 'sso' && <Route path="/auth/bridge" element={<AuthBridge />} />}
      {ENV.AUTH_MODE === 'standalone' && <Route path="/login" element={<Login />} />}
    </Routes>
  )
}

export default App