import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/use-auth'
import Layout from './layout'
import Login from './pages/login'
import Dashboard from './pages/dashboard'
import TechRequirementList from './pages/tech-requirement-list'
import TechRequirementForm from './pages/tech-requirement-form'
import TechRequirementDetail from './pages/tech-requirement-detail'
import TechRequirementImport from './pages/tech-requirement-import'
import CreativeRequirementList from './pages/creative-requirement-list'
import CreativeRequirementForm from './pages/creative-requirement-form'
import CreativeRequirementDetail from './pages/creative-requirement-detail'
import RequirementImport from './pages/requirement-import'
import AdminUsersPage from './pages/admin/users'
import ProfilePage from './pages/profile'
import SettingsPage from './pages/settings'
import DebugPage from './pages/debug'

function App() {
  const { isAuthenticated } = useAuth()

  // 顶层开放 /login，避免任何情况下出现 "No routes matched /login"
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/debug" element={<DebugPage />} />
      <Route path="/" element={<Layout />}>
        {/* 仪表盘 */}
        <Route index element={<Dashboard />} />

        {/* 技术部需求 */}
        <Route path="departments/tech" element={<TechRequirementList />} />
        <Route path="tech-requirements/new" element={<TechRequirementForm />} />
        <Route path="tech-requirements/:id" element={<TechRequirementDetail />} />
        <Route path="tech-requirements/:id/edit" element={<TechRequirementForm />} />
        <Route path="tech-requirements/import" element={<TechRequirementImport />} />

        {/* 创意部需求 */}
        <Route path="departments/creative" element={<CreativeRequirementList />} />
        <Route path="creative-requirements/new" element={<CreativeRequirementForm />} />
        <Route path="creative-requirements/:id" element={<CreativeRequirementDetail />} />
        <Route path="creative-requirements/:id/edit" element={<CreativeRequirementForm />} />

        {/* 通用导入（用于创意部） */}
        <Route path="requirements/import" element={<RequirementImport />} />
        <Route path="admin/users" element={<AdminUsersPage />} />
        
        {/* 用户设置 */}
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />

        {/* 兼容/占位重定向，避免旧入口 404 */}
        <Route path="requirements/*" element={<Navigate to="/departments/tech" replace />} />
        <Route path="departments" element={<Navigate to="/departments/tech" replace />} />
        <Route path="tech/requirements" element={<Navigate to="/departments/tech" replace />} />
        <Route path="tech/requirements/new" element={<Navigate to="/tech-requirements/new" replace />} />
        <Route path="tech/requirements/import" element={<Navigate to="/tech-requirement-import" replace />} />
        <Route path="reports" element={<Navigate to="/" replace />} />
        <Route path="analytics" element={<Navigate to="/" replace />} />
        <Route path="database-management" element={<Navigate to="/" replace />} />
      </Route>

      {/* 未匹配路径：根据是否登录跳转 */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
    </Routes>
  )
}

export default App