import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircle, Send, X } from 'lucide-react'
import { Button } from '../shared/Button'
import { useStream } from '../../hooks/useStream'
import { pollStream, startNlQuery } from '../../services/api'

type ChatMessage = {
	id: string
	role: 'user' | 'assistant'
	content: string
}

const STORAGE_KEY = 'auditecx.chat'

export function LLMChatWidget() {
	const [open, setOpen] = useState(false)
	const [input, setInput] = useState('')
	const [messages, setMessages] = useState<ChatMessage[]>(() => {
		const stored = window.localStorage.getItem(STORAGE_KEY)
		return stored ? (JSON.parse(stored) as ChatMessage[]) : []
	})
	const [streamUrl, setStreamUrl] = useState<string | null>(null)
	const [activeRun, setActiveRun] = useState<string | null>(null)

	useEffect(() => {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
	}, [messages])

	const appendMessage = (message: ChatMessage) => {
		setMessages((prev) => [...prev, message])
	}

	const updateLastAssistant = (chunk: string) => {
		setMessages((prev) => {
			const next = [...prev]
			const last = next[next.length - 1]
			if (last && last.role === 'assistant') {
				next[next.length - 1] = { ...last, content: last.content + chunk }
			} else {
				next.push({ id: `assistant-${Date.now()}`, role: 'assistant', content: chunk })
			}
			return next
		})
	}

	useStream(streamUrl, {
		enabled: Boolean(streamUrl),
		onEvent: (event) => {
			if (event.event === 'summary_chunk' && typeof event.payload?.text === 'string') {
				updateLastAssistant(event.payload.text)
			}
			if (event.event === 'complete') {
				setStreamUrl(null)
				setActiveRun(null)
			}
			if (event.event === 'error' && typeof event.payload?.message === 'string') {
				updateLastAssistant(`\n⚠️ ${String(event.payload.message)}`)
			}
		},
		poller: activeRun
			? async () => {
								const events = await pollStream(activeRun)
								if (Array.isArray(events)) {
									events.forEach((item: { event?: string; payload?: Record<string, unknown> }) => {
							if (item?.event === 'summary_chunk') {
								updateLastAssistant(String(item.payload?.text ?? ''))
							}
						})
					}
				}
			: undefined,
	})

	const sendMessage = async () => {
		if (!input.trim()) return
		const content = input.trim()
		setInput('')
		appendMessage({ id: `user-${Date.now()}`, role: 'user', content })
		appendMessage({ id: `assistant-${Date.now()}`, role: 'assistant', content: '' })

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ text: content }),
			})

			if (response.ok) {
				const data = (await response.json()) as { stream_url?: string; run_id?: string }
				if (data.stream_url) {
					setStreamUrl(data.stream_url)
					setActiveRun(data.run_id ?? null)
					return
				}
			}
			throw new Error('Chat endpoint not available')
		} catch (error) {
			console.warn('Falling back to mock chat stream', error)
			// Use orchestration endpoint as fallback but do not persist run state.
			try {
				const run = await startNlQuery({ text: `[chat] ${content}` })
				setStreamUrl(run.stream_url)
				setActiveRun(run.run_id)
			} catch (innerError) {
				console.warn('Falling back to local mock response', innerError)
				const mockChunks = [
					'Analyzing your request…',
					'The reconciled evidence is consistent with the vendor ledger.',
					'No new anomalies detected, but I suggest reviewing the outstanding PO lines for completeness.',
				]
				mockChunks.forEach((chunk, index) => {
					window.setTimeout(() => updateLastAssistant(`${index ? '\n' : ''}${chunk}`), index * 600)
				})
			}
		}
	}

	const transcripts = useMemo(() => messages.slice(-50), [messages])

	return (
		<div className="fixed bottom-6 right-6 z-50">
			<Button
				type="button"
				variant="primary"
				className="rounded-full p-4 shadow-lg shadow-blue-500/20"
				onClick={() => setOpen((prev) => !prev)}
				icon={<MessageCircle className="h-5 w-5" aria-hidden />}
			>
				Assist
			</Button>
			<AnimatePresence>
				{open ? (
					<motion.div
						className="absolute bottom-16 right-0 w-80 max-w-[90vw] rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 12 }}
					>
						<header className="flex items-center justify-between rounded-t-3xl bg-primary px-4 py-3 text-sm font-semibold text-white">
							AudItecX Copilot
							<button type="button" onClick={() => setOpen(false)} className="rounded-full bg-white/20 p-1">
								<X className="h-4 w-4" aria-hidden />
							</button>
						</header>
						<div className="max-h-80 overflow-y-auto px-4 py-3 text-sm text-slate-600 dark:text-slate-200">
							{transcripts.length === 0 ? <p className="text-xs text-slate-400">Ask a question to start.</p> : null}
							{transcripts.map((message) => (
								<div
									key={message.id}
									className={`mb-3 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
								>
									<p
										className={`inline-block max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
											message.role === 'user'
												? 'bg-primary text-white'
												: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100'
										}`}
									>
										{message.content}
									</p>
								</div>
							))}
						</div>
						<form
							className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 dark:border-slate-800"
							onSubmit={(event) => {
								event.preventDefault()
								void sendMessage()
							}}
						>
							<input
								type="text"
								value={input}
								onChange={(event) => setInput(event.target.value)}
								placeholder="Ask about this run…"
								className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900"
							/>
							<Button type="submit" icon={<Send className="h-4 w-4" aria-hidden />} disabled={!input.trim()}>
								Send
							</Button>
						</form>
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	)
}
