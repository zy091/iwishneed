import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/use-auth'
import Layout from './layout'
import Login from './pages/login'
import Dashboard from './pages/dashboard'
import RequirementList from './pages/requirement-list'
import RequirementForm from './pages/requirement-form'
import RequirementDetail from './pages/requirement-detail'
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
        
        {/* 需求管理 */}
        <Route path="requirements" element={<RequirementList />} />
        <Route path="requirements/new" element={<RequirementForm />} />
        <Route path="requirements/import" element={<RequirementImport />} />
        <Route path="requirements/:id" element={<RequirementDetail />} />
        <Route path="requirements/:id/edit" element={<RequirementForm />} />
        
        {/* 部门分类 */}
        <Route path="departments/tech" element={<RequirementList />} />
        <Route path="departments/creative" element={<RequirementList />} />
        
        {/* 报表分析 */}
        <Route path="reports" element={<Dashboard />} />
        <Route path="analytics" element={<Dashboard />} />
        
        {/* 兼容旧路由 */}
        <Route path="tech/requirements" element={<Navigate to="/departments/tech" replace />} />
        <Route path="tech/requirements/new" element={<Navigate to="/requirements/new?department=tech" replace />} />
        <Route path="tech/requirements/import" element={<Navigate to="/requirements/import?department=tech" replace />} />
        <Route path="creative/requirements" element={<Navigate to="/departments/creative" replace />} />
        <Route path="creative/requirements/new" element={<Navigate to="/requirements/new?department=creative" replace />} />
        <Route path="creative/requirements/import" element={<Navigate to="/requirements/import?department=creative" replace />} />
      </Route>
      
      {/* 其他路由 */}
      {ENV.AUTH_MODE === 'sso' && <Route path="/auth/bridge" element={<AuthBridge />} />}
      {ENV.AUTH_MODE === 'standalone' && <Route path="/login" element={<Login />} />}
    </Routes>
  )
}

export default App