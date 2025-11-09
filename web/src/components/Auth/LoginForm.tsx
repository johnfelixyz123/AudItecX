import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Shield, LogIn } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../shared/Button'
import type { UserRole } from '../../constants/routes'

const ROLE_OPTIONS: Array<{ label: string; value: UserRole; description: string }> = [
	{ label: 'Internal Auditor', value: 'internal', description: 'Full access to evidence and orchestration.' },
	{ label: 'External Auditor', value: 'external', description: 'Read-only access with evidence download rights.' },
	{ label: 'Compliance Officer', value: 'compliance', description: 'Policy dashboards and KPI monitoring.' },
	{ label: 'Admin', value: 'admin', description: 'User management and global controls.' },
]

export function LoginForm() {
	const { login, loading } = useAuth()
	const navigate = useNavigate()
	const location = useLocation()
	const [email, setEmail] = useState('auditor@example.com')
	const [password, setPassword] = useState('auditecx')
	const [role, setRole] = useState<UserRole>('internal')
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		try {
			const targetRoute = await login({ email, password, role })
			const redirectTo = (location.state as { from?: Location })?.from?.pathname ?? targetRoute ?? '/'
			navigate(redirectTo, { replace: true })
		} catch (err) {
			console.error(err)
			setError('Unable to sign in. Please try again.')
		}
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6" aria-label="AudItecX login form">
			<div className="space-y-2">
				<label className="text-sm font-semibold text-slate-600 dark:text-slate-300" htmlFor="email">
					Email
				</label>
				<input
					id="email"
					type="email"
					required
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
				/>
			</div>
			<div className="space-y-2">
				<label className="text-sm font-semibold text-slate-600 dark:text-slate-300" htmlFor="password">
					Password
				</label>
				<input
					id="password"
					type="password"
					required
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
				/>
			</div>
			<fieldset className="space-y-3">
				<legend className="text-sm font-semibold text-slate-600 dark:text-slate-300">Choose your role</legend>
				<div className="grid gap-3 sm:grid-cols-2">
					{ROLE_OPTIONS.map((option) => (
						<label
							key={option.value}
							className="group flex cursor-pointer flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-primary hover:shadow-card dark:border-slate-700 dark:bg-slate-900"
						>
							<div className="flex items-center gap-2">
								<input
									type="radio"
									name="role"
									value={option.value}
									checked={role === option.value}
									onChange={() => setRole(option.value)}
									className="accent-primary"
								/>
								<span className="text-sm font-semibold text-slate-700 dark:text-slate-100">{option.label}</span>
							</div>
							<p className="text-xs text-slate-500 dark:text-slate-400">{option.description}</p>
						</label>
					))}
				</div>
			</fieldset>
			{error ? <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</p> : null}
			<Button type="submit" className="w-full justify-center" icon={<LogIn className="h-4 w-4" aria-hidden />} disabled={loading}>
				{loading ? 'Signing in...' : 'Sign in'}
			</Button>
			<div className="flex items-center justify-between text-xs text-slate-400">
				<button type="button" className="flex items-center gap-2 text-slate-400 hover:text-primary">
					<Shield className="h-3.5 w-3.5" aria-hidden /> SSO (mock)
				</button>
				<button type="button" className="flex items-center gap-2 text-slate-400 hover:text-primary">
					Continue <ArrowRight className="h-3.5 w-3.5" aria-hidden />
				</button>
			</div>
		</form>
	)
}
