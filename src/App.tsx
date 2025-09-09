import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './layout'
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
import StaffManagementPage from './pages/admin/staff-management'
import ProfilePage from './pages/profile'
import SettingsPage from './pages/settings'

function App() {
  const { user } = useAuth()

  return (
    <Routes>
      {/* 主应用路�?- 需要登�?*/}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        {/* 仪表�?*/}
        <Route index element={<Dashboard />} />

        {/* 技术部需�?*/}
        <Route path="departments/tech" element={<TechRequirementList />} />
        <Route path="tech-requirements/new" element={<TechRequirementForm />} />
        <Route path="tech-requirements/:id" element={<TechRequirementDetail />} />
        <Route path="tech-requirements/:id/edit" element={<TechRequirementForm />} />
        <Route path="tech-requirements/import" element={<TechRequirementImport />} />

        {/* 创意部需�?*/}
        <Route path="departments/creative" element={<CreativeRequirementList />} />
        <Route path="creative-requirements/new" element={<CreativeRequirementForm />} />
        <Route path="creative-requirements/:id" element={<CreativeRequirementDetail />} />
        <Route path="creative-requirements/:id/edit" element={<CreativeRequirementForm />} />

        {/* 通用导入 */}
        <Route path="requirements/import" element={<RequirementImport />} />
        
        {/* 管理员页�?- 需要管理员权限 */}
        <Route path="admin/users" element={
          <ProtectedRoute requireAdmin>
            <AdminUsersPage />
          </ProtectedRoute>
        } />
        <Route path="admin/staff" element={
          <ProtectedRoute requireAdmin>
            <StaffManagementPage />
          </ProtectedRoute>
        } />
        
        {/* 用户设置 */}
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />

        {/* 兼容重定�?*/}
        <Route path="requirements/*" element={<Navigate to="/departments/tech" replace />} />
        <Route path="departments" element={<Navigate to="/departments/tech" replace />} />
        <Route path="tech/requirements" element={<Navigate to="/departments/tech" replace />} />
        <Route path="tech/requirements/new" element={<Navigate to="/tech-requirements/new" replace />} />
        <Route path="tech/requirements/import" element={<Navigate to="/tech-requirements/import" replace />} />
        <Route path="reports" element={<Navigate to="/" replace />} />
        <Route path="analytics" element={<Navigate to="/" replace />} />
      </Route>

      {/* 未匹配路径：根据是否登录跳转 */}
      <Route path="*" element={<Navigate to={user ? "/" : "/"} replace />} />
    </Routes>
  )
}

export default App
