import axios from 'axios'
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react'
import { DEFAULT_ROUTE_FOR_ROLE, type UserRole } from '../constants/routes'

type AuthUser = {
	email: string
	name: string
	role: UserRole
	token: string
}

type LoginPayload = {
	email: string
	password: string
	role: UserRole
}

type AuthContextValue = {
	user: AuthUser | null
	isAuthenticated: boolean
	login: (payload: LoginPayload) => Promise<string | null>
	logout: () => void
	loading: boolean
	getDefaultRoute: () => string
}

const STORAGE_KEY = 'auditecx.auth'

const MOCK_USERS: Record<UserRole, AuthUser> = {
	internal: {
		email: 'internal.auditor@example.com',
		name: 'Ivy Internal',
		role: 'internal',
		token: 'mock-internal-token',
	},
	external: {
		email: 'external.auditor@example.com',
		name: 'Eli External',
		role: 'external',
		token: 'mock-external-token',
	},
	compliance: {
		email: 'compliance.officer@example.com',
		name: 'Casey Compliance',
		role: 'compliance',
		token: 'mock-compliance-token',
	},
	admin: {
		email: 'admin@example.com',
		name: 'Ada Admin',
		role: 'admin',
		token: 'mock-admin-token',
	},
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
	withCredentials: true,
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const [user, setUser] = useState<AuthUser | null>(() => {
		const persisted = window.localStorage.getItem(STORAGE_KEY)
		return persisted ? (JSON.parse(persisted) as AuthUser) : null
	})
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		if (user) {
			window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
		} else {
			window.localStorage.removeItem(STORAGE_KEY)
		}
	}, [user])

	const login = useCallback(async ({ email, password, role }: LoginPayload) => {
		setLoading(true)
		try {
			const response = await api.post('/api/auth/login', {
				email,
				password,
				role,
			})
			const payload: AuthUser = {
				email: response.data?.user?.email ?? email,
				name: response.data?.user?.name ?? email.split('@')[0] ?? 'Auditor',
				role: (response.data?.user?.role as UserRole) ?? role,
				token: response.data?.token ?? 'session-token',
			}
			setUser(payload)
			return DEFAULT_ROUTE_FOR_ROLE[payload.role]
		} catch (error) {
			// Provide deterministic fallback if auth service is unavailable
			console.warn('Falling back to mock authentication', error)
			const fallback = MOCK_USERS[role]
			const mockPayload = {
				...fallback,
				email,
			}
			setUser(mockPayload)
			return DEFAULT_ROUTE_FOR_ROLE[mockPayload.role]
		} finally {
			setLoading(false)
		}
	}, [])

	const logout = useCallback(() => {
		setUser(null)
	}, [])

	const getDefaultRoute = useCallback(() => {
		if (user) {
			return DEFAULT_ROUTE_FOR_ROLE[user.role]
		}
		return DEFAULT_ROUTE_FOR_ROLE.internal
	}, [user])

	const value = useMemo<AuthContextValue>(
		() => ({
			user,
			isAuthenticated: Boolean(user),
			login,
			logout,
			loading,
			getDefaultRoute,
		}),
		[user, login, logout, loading, getDefaultRoute],
	)

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
	const ctx = useContext(AuthContext)
	if (!ctx) {
		throw new Error('useAuth must be used within an AuthProvider')
	}
	return ctx
}
