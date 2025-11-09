import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import { LoginForm } from '../components/Auth/LoginForm'
import { useTheme } from '../hooks/useTheme'

export default function LoginPage() {
	const { theme } = useTheme()

	return (
		<div className="relative flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
			<motion.div
				className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.35),_transparent_55%)]"
				animate={{ opacity: theme === 'dark' ? 0.6 : 0.4 }}
				transition={{ duration: 1.2 }}
			/>
			<div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col justify-center gap-16 px-6 py-16 lg:flex-row">
				<section className="flex flex-1 flex-col justify-center text-white">
					<motion.div
						initial={{ opacity: 0, y: 30 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, ease: 'easeOut' }}
						className="space-y-6"
					>
						<span className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-4 py-1 text-xs uppercase tracking-wide text-blue-200">
							<ShieldCheck className="h-4 w-4" aria-hidden /> AudItecX Platform
						</span>
						<h1 className="text-4xl font-bold sm:text-5xl">Secure audit orchestration for every role</h1>
						<p className="max-w-xl text-lg text-blue-100">
							Sign in to orchestrate vendor reconciliations, review live summaries, and collaborate on evidence with
							explainable anomaly detection.
						</p>
						<ul className="space-y-2 text-sm text-blue-200">
							<li>• Real-time streaming summaries from the orchestration engine</li>
							<li>• Evidence explorer and anomaly insights tailored by role</li>
							<li>• Deterministic mock data for offline demos</li>
						</ul>
					</motion.div>
				</section>
				<section className="flex-1">
					<motion.div
						className="rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur"
						initial={{ opacity: 0, x: 40 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5, ease: 'easeOut' }}
					>
						<h2 className="mb-6 text-2xl font-semibold text-white">Welcome back</h2>
						<LoginForm />
						<p className="mt-6 text-xs text-blue-100">
							Tip: In mock mode you can use any email. Select a role to explore that dashboard experience.
						</p>
					</motion.div>
				</section>
			</div>
		</div>
	)
}
