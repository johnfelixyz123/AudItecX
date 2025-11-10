import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Menu, Search, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../shared/Button'
import { ThemeSwitcher } from '../ThemeSwitcher'
import { NotificationCenter } from '../NotificationCenter'
import { cn } from '../../utils/cn'

type TopbarProps = {
	onToggleNav?: () => void
}

export function Topbar({ onToggleNav }: TopbarProps) {
	const { user, logout } = useAuth()
	const navigate = useNavigate()
	const [menuOpen, setMenuOpen] = useState(false)
	const menuRef = useRef<HTMLDivElement | null>(null)

	const handleLogout = () => {
		setMenuOpen(false)
		logout()
		navigate('/login')
	}

	useEffect(() => {
		if (!menuOpen) return
		const handleClickOutside = (event: MouseEvent) => {
			if (!menuRef.current) return
			if (!menuRef.current.contains(event.target as Node)) {
				setMenuOpen(false)
			}
		}
		const handleKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setMenuOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		document.addEventListener('keydown', handleKey)
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
			document.removeEventListener('keydown', handleKey)
		}
	}, [menuOpen])

	return (
		<header className="sticky top-0 z-40 border-b border-border/60 bg-surface/80 px-4 py-4 backdrop-blur-lg transition sm:px-6 supports-[backdrop-filter]:bg-surface/60">
			<div className="flex items-center justify-between gap-4">
				<div className="flex flex-1 items-center gap-3">
					<button
						type="button"
						onClick={onToggleNav}
						className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-surface text-muted shadow-sm transition hover:bg-surface-muted/70 focus:outline-none focus:ring-2 focus:ring-ring/40 lg:hidden"
						aria-label="Toggle navigation"
					>
						<Menu className="h-5 w-5" aria-hidden />
					</button>
					<label className="flex flex-1 items-center gap-3 rounded-xl border border-border/60 bg-surface px-3 py-2 shadow-sm focus-within:border-primary/60">
						<Search className="h-4 w-4 text-muted" aria-hidden />
					<input
						type="search"
						placeholder="Search audits, evidence, runs..."
							className="w-full border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted/70"
					/>
					</label>
				</div>
				<div className="flex items-center gap-2 sm:gap-3">
					<NotificationCenter />
					<div className="relative" ref={menuRef}>
						<button
							type="button"
							onClick={() => setMenuOpen((prev) => !prev)}
							className="flex items-center gap-3 rounded-full border border-border/60 bg-surface px-3 py-2 text-left shadow-sm transition hover:bg-surface-muted/70 focus:outline-none focus:ring-2 focus:ring-ring/40"
							aria-haspopup="menu"
							aria-expanded={menuOpen}
						>
							<div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent text-center text-sm font-semibold leading-8 text-primary-foreground">
								{user?.name?.slice(0, 2).toUpperCase() ?? 'AU'}
							</div>
							<div className="hidden sm:block">
								<p className="text-sm font-semibold text-foreground">{user?.name ?? 'Auditor'}</p>
								<p className="text-xs text-muted-foreground capitalize">{user?.role ?? 'guest'}</p>
							</div>
							<ChevronDown
								className={cn('h-4 w-4 text-muted transition', menuOpen ? 'rotate-180 text-foreground' : '')}
								aria-hidden
							/>
						</button>
						{menuOpen ? (
							<div className="absolute right-0 z-30 mt-3 w-72 rounded-2xl border border-border/60 bg-surface/95 p-4 shadow-xl shadow-[0_18px_45px_-30px_hsla(var(--shadow-elevated)/0.7)]">
								<div className="mb-3">
									<p className="text-sm font-semibold text-foreground">{user?.name ?? 'Auditor'}</p>
									<p className="text-xs text-muted-foreground capitalize">{user?.role ?? 'guest'}</p>
								</div>
								<ThemeSwitcher />
								<div className="mt-4 flex justify-end">
									<Button
										type="button"
										variant="ghost"
										className="px-3 py-2 text-sm text-muted hover:text-foreground"
										onClick={handleLogout}
										icon={<LogOut className="h-4 w-4" aria-hidden />}
									>
										Sign out
									</Button>
								</div>
							</div>
						) : null}
					</div>
				</div>
			</div>
		</header>
	)
}
