import { MoonStar, Sun } from 'lucide-react'
import { Button } from './shared/Button'
import { useTheme } from '../hooks/useTheme'

export function ThemeSwitcher() {
	const { theme, toggleTheme } = useTheme()

	return (
		<Button
			type="button"
			variant="ghost"
			aria-label="Toggle theme"
			onClick={toggleTheme}
			className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
		>
			{theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden /> : <MoonStar className="h-4 w-4" aria-hidden />}
		</Button>
	)
}
