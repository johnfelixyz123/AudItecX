import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout/Layout'
import LoginPage from './pages/Login'
import DashboardInternal from './pages/DashboardInternal'
import DashboardExternal from './pages/DashboardExternal'
import DashboardCompliance from './pages/DashboardCompliance'
import AuditWorkspace from './pages/AuditWorkspace'
import AdminPage from './pages/Admin'
import RunHistoryPage from './pages/RunHistory'
import { useAuth } from './hooks/useAuth'
import { ROUTES } from './constants/routes'
import { RequireAuth } from './components/RequireAuth'

export default function App() {
  const { isAuthenticated, getDefaultRoute } = useAuth()

  return (
    <Routes>
      <Route index element={<Navigate to={isAuthenticated ? getDefaultRoute() : ROUTES.login} replace />} />
      <Route path={ROUTES.login} element={isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path={ROUTES.dashboardInternal} element={<DashboardInternal />} />
          <Route path={ROUTES.dashboardExternal} element={<DashboardExternal />} />
          <Route path={ROUTES.dashboardCompliance} element={<DashboardCompliance />} />
          <Route path={ROUTES.workspace} element={<AuditWorkspace />} />
          <Route path={ROUTES.runHistory} element={<RunHistoryPage />} />
          <Route element={<RequireAuth allowedRoles={['admin']} />}>
            <Route path={ROUTES.admin} element={<AdminPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={isAuthenticated ? getDefaultRoute() : ROUTES.login} replace />} />
    </Routes>
  )
}
