import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { DEFAULT_ROUTE_FOR_ROLE, type UserRole, ROUTES } from '../constants/routes'

type RequireAuthProps = {
	allowedRoles?: UserRole[]
}

export function RequireAuth({ allowedRoles }: RequireAuthProps) {
	const { isAuthenticated, user } = useAuth()
	const location = useLocation()

	if (!isAuthenticated) {
		return <Navigate to={ROUTES.login} replace state={{ from: location }} />
	}

	if (allowedRoles && user && !allowedRoles.includes(user.role)) {
		return <Navigate to={DEFAULT_ROUTE_FOR_ROLE[user.role]} replace />
	}

	return <Outlet />
}
