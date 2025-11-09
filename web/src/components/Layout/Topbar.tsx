import { Bell, Menu, Search, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../shared/Button'
import { ThemeSwitcher } from '../ThemeSwitcher'

type TopbarProps = {
	onToggleNav?: () => void
}

export function Topbar({ onToggleNav }: TopbarProps) {
	const { user, logout } = useAuth()
	const navigate = useNavigate()

	const handleLogout = () => {
		logout()
		navigate('/login')
	}

	return (
		<header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 px-4 py-4 backdrop-blur-lg transition dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
			<div className="flex items-center justify-between gap-4">
				<div className="flex flex-1 items-center gap-3">
					<button
						type="button"
						onClick={onToggleNav}
						className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 lg:hidden"
						aria-label="Toggle navigation"
					>
						<Menu className="h-5 w-5" aria-hidden />
					</button>
					<label className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-primary dark:border-slate-700 dark:bg-slate-900">
					<Search className="h-4 w-4 text-slate-400" aria-hidden />
					<input
						type="search"
						placeholder="Search audits, evidence, runs..."
						className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
					/>
					</label>
				</div>
				<div className="flex items-center gap-2 sm:gap-3">
					<ThemeSwitcher />
					<button
						type="button"
						className="relative rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
						aria-label="Notifications"
					>
						<Bell className="h-4 w-4" aria-hidden />
						<span className="absolute right-1 top-1 inline-flex h-2 w-2 animate-pulse rounded-full bg-primary" />
					</button>
					<div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
						<div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-blue-500 text-center text-sm font-semibold leading-8 text-white">
							{user?.name?.slice(0, 2).toUpperCase() ?? 'AU'}
						</div>
						<div className="hidden sm:block">
							<p className="text-sm font-semibold text-slate-700 dark:text-slate-100">{user?.name ?? 'Auditor'}</p>
							<p className="text-xs text-slate-400 capitalize">{user?.role ?? 'guest'}</p>
						</div>
						<Button
							type="button"
							variant="ghost"
							className="text-slate-400 hover:text-slate-600"
							onClick={handleLogout}
							icon={<LogOut className="h-4 w-4" aria-hidden />}
							aria-label="Sign out"
						/>
					</div>
				</div>
			</div>
		</header>
	)
}
