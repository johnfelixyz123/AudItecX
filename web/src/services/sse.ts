export function createEventSource(url: string) {
	if (typeof window === 'undefined') {
		throw new Error('EventSource is only available in the browser')
	}
	if (!('EventSource' in window)) {
		throw new Error('EventSource is not supported in this environment')
	}
	return new EventSource(url)
}
