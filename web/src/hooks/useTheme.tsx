import { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark'

type ThemeContextValue = {
	theme: Theme
	toggleTheme: () => void
	setTheme: (theme: Theme) => void
}

const STORAGE_KEY = 'auditecx.theme'

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
	const [theme, setThemeState] = useState<Theme>(() => {
		const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null
		if (stored === 'light' || stored === 'dark') {
			return stored
		}
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
	})

	useEffect(() => {
		const root = document.documentElement
		root.dataset.theme = theme
		window.localStorage.setItem(STORAGE_KEY, theme)
	}, [theme])

	const value = useMemo<ThemeContextValue>(
		() => ({
			theme,
			toggleTheme: () => setThemeState((prev) => (prev === 'light' ? 'dark' : 'light')),
			setTheme: (next: Theme) => setThemeState(next),
		}),
		[theme],
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
