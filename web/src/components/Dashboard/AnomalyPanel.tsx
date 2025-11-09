import { AlertTriangle, ArrowRightCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '../shared/Button'

export type AnomalyRecord = {
	id: string
	label: string
	severity: 'low' | 'medium' | 'high'
	rationale: string
	suggestion?: string
}

type Props = {
	anomalies: AnomalyRecord[]
	onAction?: (anomaly: AnomalyRecord) => void
}

const severityStyles: Record<AnomalyRecord['severity'], string> = {
	low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
	medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
	high: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
}

export function AnomalyPanel({ anomalies, onAction }: Props) {
	return (
		<section className="card">
			<header className="mb-4 flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Anomalies detected</h2>
					<p className="text-xs text-slate-500 dark:text-slate-400">Explainable discrepancies surfaced during reconciliation.</p>
				</div>
				<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-800/60">
					{anomalies.length} findings
				</span>
			</header>
			<div className="space-y-3">
				{anomalies.length === 0 ? (
					<p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
						No anomalies surfaced for this run.
					</p>
				) : null}
				{anomalies.map((anomaly, index) => (
					<motion.article
						key={anomaly.id}
						className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.05 }}
					>
						<header className="flex items-center gap-3">
							<span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${severityStyles[anomaly.severity]}`}>
								<AlertTriangle className="h-3.5 w-3.5" aria-hidden />
								{anomaly.label}
							</span>
							<span className="text-xs uppercase text-slate-400">Severity: {anomaly.severity}</span>
						</header>
						<p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{anomaly.rationale}</p>
						{anomaly.suggestion ? (
							<p className="mt-2 rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
								Suggested action: {anomaly.suggestion}
							</p>
						) : null}
						{onAction ? (
							<div className="mt-3 flex gap-2">
								<Button
									type="button"
									variant="ghost"
									onClick={() => onAction(anomaly)}
									className="text-sm text-primary"
									icon={<ArrowRightCircle className="h-4 w-4" aria-hidden />}
								>
									Create follow-up
								</Button>
							</div>
						) : null}
					</motion.article>
				))}
			</div>
		</section>
	)
}
