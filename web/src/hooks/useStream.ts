import { useCallback, useEffect, useRef, useState } from 'react'

type StreamEvent = {
	event?: string
	payload?: Record<string, unknown>
}

type UseStreamOptions = {
	enabled?: boolean
	onEvent?: (event: StreamEvent) => void
	poller?: () => Promise<void>
	reconnectIntervalMs?: number
}

type StreamState = {
	isConnected: boolean
	lastEvent: StreamEvent | null
	error: string | null
}

const RETRY_LIMIT = 5

export function useStream(url: string | null, options: UseStreamOptions = {}): StreamState {
	const { enabled = true, onEvent, poller, reconnectIntervalMs = 4000 } = options
	const [state, setState] = useState<StreamState>({ isConnected: false, lastEvent: null, error: null })
	const retryRef = useRef(0)
	const sourceRef = useRef<EventSource | null>(null)

	const closeSource = useCallback(() => {
		if (sourceRef.current) {
			sourceRef.current.close()
			sourceRef.current = null
		}
	}, [])

	useEffect(() => {
		if (!url || !enabled) {
			closeSource()
			return
		}

		let isMounted = true

		const connect = () => {
			closeSource()
			try {
				const es = new EventSource(url)
				sourceRef.current = es
				es.onopen = () => {
					retryRef.current = 0
					if (!isMounted) return
					setState((prev) => ({ ...prev, isConnected: true, error: null }))
				}
				es.onmessage = (message) => {
					if (!isMounted) return
					let parsed: StreamEvent
					try {
						parsed = JSON.parse(message.data) as StreamEvent
								} catch (error) {
									console.warn('Failed to parse stream payload', error)
									parsed = { event: 'message', payload: { raw: message.data } }
					}
					setState({ isConnected: true, lastEvent: parsed, error: null })
					onEvent?.(parsed)
				}
				es.onerror = () => {
					if (!isMounted) return
					closeSource()
					const nextRetry = retryRef.current + 1
					retryRef.current = nextRetry
					if (nextRetry >= RETRY_LIMIT) {
						setState((prev) => ({ ...prev, isConnected: false, error: 'stream-disconnected' }))
						void poller?.()
						return
					}
					setTimeout(connect, reconnectIntervalMs)
				}
			} catch (error) {
				console.warn('EventSource not available, switching to polling', error)
				setState((prev) => ({ ...prev, error: 'eventsource-unavailable' }))
				void poller?.()
			}
		}

		connect()

		return () => {
			isMounted = false
			closeSource()
		}
	}, [url, enabled, reconnectIntervalMs, poller, onEvent, closeSource])

	return state
}
