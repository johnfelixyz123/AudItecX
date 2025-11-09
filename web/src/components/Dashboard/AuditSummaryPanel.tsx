import { FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '../shared/Button'
import { buildDownloadUrl } from '../../services/api'

type Props = {
	runId: string | null
	summaryMarkdown: string
	statusMessage: string
	manifestPath?: string | null
	packageAvailable?: boolean
	onSend?: () => void
	onDownload?: () => void
	isStreaming: boolean
}

export function AuditSummaryPanel({
	runId,
	summaryMarkdown,
	statusMessage,
	manifestPath,
	packageAvailable,
	onSend,
	onDownload,
	isStreaming,
}: Props) {
	const downloadUrl = runId ? buildDownloadUrl(runId) : null

	const summaryItems = extractSummaryItems(summaryMarkdown)

	return (
		<section className="card" aria-live="polite">
			<header className="mb-4 flex flex-wrap items-center gap-3">
				<div>
					<h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Streaming summary</h2>
					<p className="text-xs text-slate-500 dark:text-slate-400">Updates arrive live as the orchestrator progresses.</p>
				</div>
				{runId ? (
					<span className="ml-auto inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-900/40 dark:text-blue-200">
						<FileText className="h-3 w-3" aria-hidden /> Run {runId}
					</span>
				) : null}
			</header>
			<div className="relative min-h-[220px] rounded-xl border border-slate-200 bg-white/80 p-4 text-sm leading-relaxed text-slate-700 shadow-inner dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
				{summaryItems.length ? (
					<ul className="space-y-3">
						{summaryItems.map((item, index) => {
							const negative = isNegativeItem(item)
							return (
								<li key={`${item}-${index}`} className="flex items-start gap-2">
									<span className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full ${negative ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-200' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-200'}`}>
										{negative ? <XCircle className="h-4 w-4" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}
									</span>
									<p className="flex-1 text-left text-slate-700 dark:text-slate-200">{item}</p>
								</li>
							)
						})}
					</ul>
				) : (
					<p className="italic text-slate-500 dark:text-slate-400">Awaiting streaming output…</p>
				)}
				{isStreaming ? (
					<div className="absolute inset-x-0 bottom-0 h-1 animate-pulseGlow rounded-full bg-gradient-to-r from-blue-500 via-sky-400 to-blue-600" aria-hidden />
				) : null}
			</div>
			<footer className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
				<span className="flex items-center gap-2">
					{isStreaming ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
					{statusMessage}
				</span>
				<div className="ml-auto flex items-center gap-2">
					<Button
						type="button"
						variant="ghost"
						disabled={!downloadUrl || !packageAvailable}
						onClick={onDownload}
						icon={<FileText className="h-4 w-4" aria-hidden />}
					>
						Download
					</Button>
					<Button type="button" variant="primary" disabled={!packageAvailable} onClick={onSend}>
						Send package
					</Button>
				</div>
			</footer>
			{manifestPath ? (
				<p className="mt-2 text-xs text-slate-400">Manifest: {manifestPath}</p>
			) : (
				<p className="mt-2 text-xs text-slate-400">Manifest: Pending…</p>
			)}
		</section>
	)
}

function extractSummaryItems(summary: string): string[] {
	const normalized = summary.replace(/\r/g, '').trim()
	if (!normalized) return []
	const sentences = normalized.match(/[^.!?\n]+[.!?]?/g) ?? []
	return sentences
		.map((sentence) => sentence.trim())
		.filter(Boolean)
		.map((sentence) => sentence.replace(/^[-–*\d.\s]+/, ''))
		.map((sentence) => sentence.charAt(0).toUpperCase() + sentence.slice(1))
		.map((sentence) => sentence.endsWith('.') || sentence.endsWith('!') || sentence.endsWith('?') ? sentence : `${sentence}.`)
}

function isNegativeItem(text: string): boolean {
	const value = text.toLowerCase()
	const positiveSignals = [
		/no (material|blocking|critical|major)?\s*(issue|anomaly|gap|exception|variance|alert)s?/i,
		/(reconciled|aligned|matched|collected|completed|ready|sent|delivered|cleared|resolved|verified|confirmed)/i,
		/(confidence|score)\s*(\d{2,3})?%/i,
	]
	if (positiveSignals.some((pattern) => pattern.test(text))) {
		return false
	}
	const negativeSignals = [
		/(error|fail|failed|unable|missing|delay|delayed|risk|blocked|pending|warning|violation|concern|unmatched|discrepancy|alert|exception|anomaly detected|flagged|investigate)/i,
		/\bnot (aligned|reconciled|completed|ready|available)/i,
	]
	return negativeSignals.some((pattern) => pattern.test(value))
}
