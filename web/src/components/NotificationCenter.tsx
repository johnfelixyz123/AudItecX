import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, CheckCircle2, Loader2 } from 'lucide-react'

import { Button } from './shared/Button'
import { acknowledgeNotifications, fetchNotifications, type NotificationItem } from '../services/api'

type Props = {
	pollIntervalMs?: number
}

type ToastState = {
	id: string
	message: string
} | null

export function NotificationCenter({ pollIntervalMs = 15_000 }: Props) {
	const containerRef = useRef<HTMLDivElement | null>(null)
	const intervalRef = useRef<number | undefined>(undefined)
	const toastTimeoutRef = useRef<number | undefined>(undefined)
	const isMountedRef = useRef(true)
	const initializedRef = useRef(false)
	const seenNotificationsRef = useRef<Set<string>>(new Set())

	const [open, setOpen] = useState(false)
	const [notifications, setNotifications] = useState<NotificationItem[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [toast, setToast] = useState<ToastState>(null)

	const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications])

	const clearToast = useCallback(() => {
		if (toastTimeoutRef.current) {
			window.clearTimeout(toastTimeoutRef.current)
			toastTimeoutRef.current = undefined
		}
		setToast(null)
	}, [])

	const showToast = useCallback(
		(message: string, id: string) => {
			setToast({ id, message })
			if (toastTimeoutRef.current) {
				window.clearTimeout(toastTimeoutRef.current)
			}
			toastTimeoutRef.current = window.setTimeout(() => {
				clearToast()
			}, 4000)
		},
		[clearToast],
	)

	const hydrateNotifications = useCallback(async () => {
		setLoading(true)
		try {
			const payload = await fetchNotifications()
			if (!isMountedRef.current) return

			const newlySeen = payload.filter((item) => !seenNotificationsRef.current.has(item.id))
			if (initializedRef.current) {
				newlySeen
					.filter((item) => !item.read)
					.forEach((item) => {
						showToast(item.message, item.id)
					})
			}

			payload.forEach((item) => {
				seenNotificationsRef.current.add(item.id)
			})

			setNotifications(payload)
			setError(null)
			initializedRef.current = true
		} catch (err) {
			if (!isMountedRef.current) return
			console.warn('Failed to load notifications', err)
			setError('Unable to load notifications')
		} finally {
			if (isMountedRef.current) {
				setLoading(false)
			}
		}
	}, [showToast])

	useEffect(() => {
		void hydrateNotifications()
		if (pollIntervalMs <= 0) {
			return undefined
		}
		intervalRef.current = window.setInterval(() => {
			void hydrateNotifications()
		}, pollIntervalMs)
		return () => {
			if (intervalRef.current) {
				window.clearInterval(intervalRef.current)
				intervalRef.current = undefined
			}
		}
	}, [hydrateNotifications, pollIntervalMs])

	useEffect(() => {
		return () => {
			isMountedRef.current = false
			if (intervalRef.current) {
				window.clearInterval(intervalRef.current)
			}
			if (toastTimeoutRef.current) {
				window.clearTimeout(toastTimeoutRef.current)
			}
		}
	}, [])

	useEffect(() => {
		if (!open) return undefined

		const handleClickOutside = (event: globalThis.MouseEvent) => {
			if (!containerRef.current) return
			if (!containerRef.current.contains(event.target as Node)) {
				setOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [open])

	const handleToggle = () => {
		setOpen((prev) => !prev)
		if (error) {
			setError(null)
		}
	}

	const handleMarkAsRead = async (ids: string[]) => {
		if (!ids.length) return
		try {
			await acknowledgeNotifications(ids)
			if (!isMountedRef.current) return
			setNotifications((prev) =>
				prev.map((item) => (ids.includes(item.id) ? { ...item, read: true } : item)),
			)
		} catch (err) {
			console.warn('Failed to acknowledge notifications', err)
			if (isMountedRef.current) {
				setError('Failed to mark notifications as read')
			}
		}
	}

	const handleMarkSingle = (id: string) => {
		void handleMarkAsRead([id])
	}

	const handleMarkAll = () => {
		const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id)
		void handleMarkAsRead(unreadIds)
	}

	return (
		<div className="relative" ref={containerRef}>
			<button
				type="button"
				onClick={handleToggle}
				className="relative rounded-full border border-border/60 bg-surface p-2 text-muted transition hover:bg-surface-muted/70 focus:outline-none focus:ring-2 focus:ring-ring/40"
				aria-label={unreadCount ? `Notifications (${unreadCount} unread)` : 'Notifications'}
				aria-haspopup="dialog"
				aria-expanded={open}
			>
				<Bell className="h-4 w-4" aria-hidden />
				{unreadCount > 0 ? (
					<span className="absolute -right-0.5 -top-0.5 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold leading-none text-primary-foreground">
						{unreadCount > 9 ? '9+' : unreadCount}
					</span>
				) : null}
			</button>
			{open ? (
				<div className="absolute right-0 z-30 mt-3 w-80 rounded-2xl border border-border/60 bg-surface/95 p-4 shadow-xl shadow-[0_18px_45px_-28px_hsla(var(--shadow-elevated)/0.6)] backdrop-blur">
					<div className="mb-3 flex items-center justify-between">
						<div>
							<h3 className="text-sm font-semibold text-foreground">Notifications</h3>
							<p className="text-xs text-muted-foreground">Stay in sync with audit runs and anomalies.</p>
						</div>
						{unreadCount > 0 ? (
							<Button type="button" variant="ghost" className="text-xs" onClick={handleMarkAll}>
								Mark all as read
							</Button>
						) : null}
					</div>
					<div className="max-h-64 space-y-2 overflow-y-auto pr-1">
						{loading ? (
							<div className="flex items-center gap-2 text-sm text-muted">
								<Loader2 className="h-4 w-4 animate-spin" aria-hidden />
								Fetching notifications…
							</div>
						) : null}
						{!loading && notifications.length === 0 ? (
							<p className="text-sm text-muted">You're all caught up.</p>
						) : null}
						{notifications.map((notification) => (
							<article
								key={notification.id}
								className={`rounded-xl border px-3 py-2 text-sm transition ${notification.read ? 'border-border/50 bg-surface' : 'border-primary/50 bg-primary/10 shadow-card'}`}
							>
								<header className="flex items-start justify-between gap-2">
									<div>
										<p className="font-semibold capitalize text-foreground">{formatNotificationType(notification.type)}</p>
										<p className="text-xs text-muted-foreground">{formatTimestamp(notification.timestamp)}</p>
									</div>
									{notification.read ? (
										<span className="text-xs font-medium text-primary">Read</span>
									) : (
										<Button type="button" variant="ghost" className="text-xs" onClick={() => handleMarkSingle(notification.id)}>
											<CheckCircle2 className="mr-1 inline h-3 w-3" aria-hidden /> Mark read
										</Button>
									)}
								</header>
								<p className="mt-1 text-foreground/80">{notification.message}</p>
							</article>
						))}
					</div>
					{error ? <p className="mt-2 text-xs text-primary">{error}</p> : null}
				</div>
			) : null}
			{toast ? (
				<div className="fixed bottom-6 right-6 z-40 max-w-xs rounded-2xl border border-border/60 bg-surface/95 p-3 text-sm shadow-glass">
					<p className="font-semibold text-foreground">Notification</p>
					<p className="mt-1 text-foreground/80">{toast.message}</p>
					<button
						type="button"
						className="mt-2 text-xs font-semibold text-primary underline"
						onClick={() => {
							clearToast()
						}}
					>
						Dismiss
					</button>
				</div>
			) : null}
		</div>
	)
}

function formatNotificationType(notificationType: string): string {
	switch (notificationType) {
		case 'run_complete':
			return 'Run complete'
		case 'anomaly_alert':
			return 'Anomaly alert'
		case 'simulation_complete':
			return 'Simulation complete'
		case 'simulation_anomaly_alert':
			return 'Simulation anomaly alert'
		case 'simulation_policy_alert':
			return 'Simulation policy alert'
		case 'simulation_error':
			return 'Simulation error'
		default:
			return notificationType.replace(/_/g, ' ')
	}
}

function formatTimestamp(value: string): string {
	if (!value) return 'Unknown'
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}
	return new Intl.DateTimeFormat(undefined, {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(date)
}
