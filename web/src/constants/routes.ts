export const ROUTES = {
	login: '/login',
	dashboardInternal: '/dashboard/internal',
	dashboardExternal: '/dashboard/external',
	dashboardCompliance: '/dashboard/compliance',
	admin: '/admin',
	workspace: '/workspace',
	runHistory: '/runs',
} as const

export type AppRouteKey = keyof typeof ROUTES

export const DEFAULT_ROUTE_FOR_ROLE: Record<UserRole, string> = {
	internal: ROUTES.dashboardInternal,
	external: ROUTES.dashboardExternal,
	compliance: ROUTES.dashboardCompliance,
	admin: ROUTES.admin,
}

export type UserRole = 'internal' | 'external' | 'compliance' | 'admin'
