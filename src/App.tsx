import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './layout'
import Dashboard from './pages/dashboard'
import RequirementList from './pages/requirement-list'
import RequirementDetail from './pages/requirement-detail'
import RequirementForm from './pages/requirement-form'
import Login from './pages/login'
import { useAuth } from './hooks/use-auth'
import Bridge from './pages/auth/Bridge'
import { ENV } from './config/env'

export default function App() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/bridge" element={<Bridge />} />
      <Route
        path="/"
        element={
          isAuthenticated ? <Layout /> : <Navigate to={ENV.AUTH_MODE === 'sso' ? '/auth/bridge' : '/login'} replace />
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="requirements" element={<RequirementList />} />
        <Route path="requirements/new" element={<RequirementForm />} />
        <Route path="requirements/:id" element={<RequirementDetail />} />
        <Route path="requirements/:id/edit" element={<RequirementForm />} />
      </Route>
    </Routes>
  )
}