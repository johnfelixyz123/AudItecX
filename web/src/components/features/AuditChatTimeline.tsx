import { useMemo, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn } from '../../utils/cn'
import { Button } from '../shared/Button'
import type { ConversationMessage } from '../../services/api'

type AuditChatTimelineProps = {
	runId: string | null
	messages: ConversationMessage[]
	isLoading?: boolean
	onRefresh?: () => Promise<void> | void
}

function formatTimestamp(timestamp?: string) {
	if (!timestamp) return 'pending'
	try {
		const date = new Date(timestamp)
		return date.toLocaleString(undefined, {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
		})
	} catch (error) {
		console.warn('Unable to parse timestamp', error)
		return timestamp
	}
}

function matchesSearch(message: ConversationMessage, needle: string) {
	const lowered = needle.toLowerCase()
	if (message.text.toLowerCase().includes(lowered)) {
		return true
	}
	return (message.keywords ?? []).some((keyword) => keyword.toLowerCase().includes(lowered))
}

export function AuditChatTimeline({ runId, messages, isLoading = false, onRefresh }: AuditChatTimelineProps) {
	const [searchTerm, setSearchTerm] = useState('')

	const filteredMessages = useMemo(() => {
		if (!searchTerm) return messages
		return messages.filter((message) => matchesSearch(message, searchTerm))
	}, [messages, searchTerm])

	const hasFilter = Boolean(searchTerm)
	const visibleMessages = hasFilter ? filteredMessages : messages

	return (
		<section className="card space-y-5">
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Audit Chat Timeline</h2>
					<p className="text-sm text-slate-500 dark:text-slate-400">
						Conversation captured for run {runId ?? 'pending'}
					</p>
				</div>
				<Button
					type="button"
					variant="ghost"
					onClick={() => onRefresh?.()}
					disabled={!onRefresh || !runId}
					title="Refresh timeline"
				>
					<RefreshCw className={cn('h-4 w-4', isLoading ? 'animate-spin' : undefined)} aria-hidden />
				</Button>
			</header>

			<div className="relative">
				<Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
				<input
					type="search"
					value={searchTerm}
					onChange={(event) => setSearchTerm(event.target.value)}
					placeholder="Search by keyword or text…"
					className="w-full rounded-xl border border-slate-200/80 bg-white/95 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-primary focus:outline-none dark:border-slate-700/70 dark:bg-slate-950/60 dark:text-slate-100"
				/>
				{searchTerm ? (
					<button
						type="button"
						onClick={() => setSearchTerm('')}
						className="absolute right-3 top-2 rounded-full bg-slate-200 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
					>
						Clear
					</button>
				) : null}
			</div>

			<div className="space-y-4">
				{isLoading && !messages.length ? (
					<div className="space-y-2">
						<div className="h-4 w-32 animate-pulse rounded bg-slate-200/80 dark:bg-slate-800/80" />
						<div className="h-3 w-full animate-pulse rounded bg-slate-200/70 dark:bg-slate-800/60" />
						<div className="h-3 w-5/6 animate-pulse rounded bg-slate-200/60 dark:bg-slate-800/50" />
					</div>
				) : null}

				{!isLoading && !visibleMessages.length ? (
					<div className="rounded-xl border border-dashed border-slate-200/80 bg-white/80 p-6 text-center text-sm text-slate-500 dark:border-slate-700/60 dark:bg-slate-950/40 dark:text-slate-400">
						{hasFilter ? (
							<span>No messages matched “{searchTerm}”.</span>
						) : (
							<span>No conversation captured yet. Run a request to populate this timeline.</span>
						)}
					</div>
				) : null}

				{visibleMessages.length ? (
					<ol className="relative space-y-4 border-l border-slate-200 pl-4 dark:border-slate-700">
						{visibleMessages.map((message) => {
							const accent = message.role === 'user' ? 'bg-primary dark:bg-primary/80' : 'bg-emerald-400 dark:bg-emerald-500'
							const highlight = hasFilter ? 'ring-2 ring-primary/40 dark:ring-primary/60' : ''
							return (
								<li key={message.id} className="relative pl-4">
									<span className={cn('absolute -left-[8px] top-2 h-3 w-3 rounded-full', accent)} aria-hidden />
									<div
										className={cn(
											'rounded-xl border border-slate-200/70 bg-white/95 p-4 shadow-sm transition dark:border-slate-700/60 dark:bg-slate-950/50',
											highlight,
										)}
									>
										<div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
											<span>{message.role === 'user' ? 'Auditor Request' : 'AudItecX Response'}</span>
											<span className="font-mono text-[11px]">{formatTimestamp(message.timestamp)}</span>
										</div>
										<div className="prose prose-sm max-w-none pt-3 text-slate-700 dark:prose-invert dark:text-slate-100">
											<ReactMarkdown>{message.text || '*No content recorded.*'}</ReactMarkdown>
										</div>
										{message.keywords?.length ? (
											<div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-300">
												{message.keywords.map((keyword) => (
													<span
														key={keyword}
														className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium dark:bg-slate-800/80"
													>
														{keyword}
													</span>
												))}
											</div>
										) : null}
									</div>
								</li>
							)
							})}
						</ol>
					) : null}
			</div>
		</section>
	)
}

export type { ConversationMessage }
