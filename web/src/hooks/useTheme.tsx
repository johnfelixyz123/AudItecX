import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type ThemeName = 'light' | 'dark' | 'contrast'
type ThemePreference = ThemeName | 'system'

type ThemeOption = {
	value: ThemePreference
	label: string
	description: string
}

type ThemeContextValue = {
	theme: ThemeName
	preference: ThemePreference
	availableThemes: ThemeOption[]
	setPreference: (preference: ThemePreference) => void
	setTheme: (theme: ThemeName) => void
}

const STORAGE_KEY = 'auditecx.theme'

const THEME_OPTIONS: ThemeOption[] = [
	{ value: 'system', label: 'System', description: 'Match your device setting automatically.' },
	{ value: 'light', label: 'Light', description: 'Bright interface with subtle surfaces.' },
	{ value: 'dark', label: 'Dark', description: 'Low-light mode with soft contrast.' },
	{ value: 'contrast', label: 'High contrast', description: 'Maximum contrast for clarity and focus.' },
]

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const isThemeName = (value: string | null): value is ThemeName => value === 'light' || value === 'dark' || value === 'contrast'

const isThemePreference = (value: string | null): value is ThemePreference => value === 'system' || isThemeName(value)

const getSystemTheme = (): ThemeName =>
	typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
	const [preference, setPreferenceState] = useState<ThemePreference>(() => {
		if (typeof window === 'undefined') {
			return 'system'
		}
		const stored = window.localStorage.getItem(STORAGE_KEY)
		return isThemePreference(stored) ? stored : 'system'
	})

	const [theme, setThemeState] = useState<ThemeName>(() => {
		if (typeof window === 'undefined') {
			return 'light'
		}
		const stored = window.localStorage.getItem(STORAGE_KEY)
		if (stored === 'system') {
			return getSystemTheme()
		}
		return isThemeName(stored) ? stored : getSystemTheme()
	})

	useEffect(() => {
		if (typeof window === 'undefined') return
		window.localStorage.setItem(STORAGE_KEY, preference)
	}, [preference])

	useEffect(() => {
		if (typeof window === 'undefined') return
		if (preference === 'system') {
			const resolved = getSystemTheme()
			setThemeState((current) => (current === resolved ? current : resolved))
			return
		}
		setThemeState((current) => (current === preference ? current : preference))
	}, [preference])

	useEffect(() => {
		if (typeof window === 'undefined') return undefined
		if (preference !== 'system') return undefined

		const query = window.matchMedia('(prefers-color-scheme: dark)')
		const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
			const matches = 'matches' in event ? event.matches : query.matches
			setThemeState((prev) => {
				const resolved = matches ? 'dark' : 'light'
				return prev === resolved ? prev : resolved
			})
		}

		handleChange(query)

		if (typeof query.addEventListener === 'function') {
			query.addEventListener('change', handleChange)
			return () => {
				query.removeEventListener('change', handleChange)
			}
		}

		query.addListener(handleChange)
		return () => {
			query.removeListener(handleChange)
		}
	}, [preference])

	useEffect(() => {
		if (typeof document === 'undefined') return
		const root = document.documentElement
		root.dataset.theme = theme
		root.classList.toggle('dark', theme === 'dark' || theme === 'contrast')
		root.classList.toggle('contrast', theme === 'contrast')
	}, [theme])

	const setPreference = useCallback((next: ThemePreference) => {
		setPreferenceState(next)
	}, [])

	const setTheme = useCallback((next: ThemeName) => {
		setPreferenceState(next)
	}, [])

	const value = useMemo<ThemeContextValue>(
		() => ({
			theme,
			preference,
			availableThemes: THEME_OPTIONS,
			setPreference,
			setTheme,
		}),
		[theme, preference, setPreference, setTheme],
	)

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
	const ctx = useContext(ThemeContext)
	if (!ctx) {
		throw new Error('useTheme must be used within ThemeProvider')
	}
	return ctx
}
