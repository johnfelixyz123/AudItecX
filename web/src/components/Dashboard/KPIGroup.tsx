import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp } from 'lucide-react'

export type KPIStat = {
	label: string
	value: string
	delta?: number
	helper?: string
}

export function KPIGroup({ stats }: { stats: KPIStat[] }) {
	return (
		<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{stats.map((item, index) => (
				<motion.div
					key={item.label}
					className="card border border-slate-200 bg-white/70 shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: index * 0.05, duration: 0.3 }}
				>
					<p className="text-xs uppercase tracking-wide text-slate-400">{item.label}</p>
					<div className="mt-3 flex items-end justify-between">
						<span className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{item.value}</span>
						{typeof item.delta === 'number' ? (
							<span
								className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-600 dark:bg-green-900/40 dark:text-green-300"
							>
								{item.delta >= 0 ? <TrendingUp className="h-3 w-3" aria-hidden /> : <TrendingDown className="h-3 w-3" aria-hidden />} {Math.abs(item.delta)}%
							</span>
						) : null}
					</div>
					{item.helper ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{item.helper}</p> : null}
				</motion.div>
			))}
		</div>
	)
}
