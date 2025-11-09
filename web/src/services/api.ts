import axios from 'axios'
import type { UserRole } from '../constants/routes'

const client = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
	withCredentials: true,
	timeout: 15_000,
})

export type StartRunResponse = {
	run_id: string
	stream_url: string
	email?: string
}

export type ManifestSummary = {
	run_id: string
	manifest_path?: string
	package_path?: string
	package_ready?: boolean
	summary_text?: string
	documents?: Array<Record<string, unknown>>
	journal_entries?: Array<Record<string, unknown>>
	anomalies?: Array<Record<string, unknown>>
}

export async function login(payload: {
	email: string
	password: string
	role: UserRole
}) {
	return client.post('/api/auth/login', payload)
}

export async function startNlQuery(payload: { text: string; email?: string | null }) {
	const response = await client.post<StartRunResponse>('/api/nl_query', payload)
	return response.data
}

export async function fetchRuns() {
	try {
		const response = await client.get('/api/runs')
		return response.data
	} catch (error) {
		console.warn('Falling back to mock run history', error)
		return [
			{
				run_id: 'MOCK-001',
				intent: 'generate_package',
				created_at: new Date().toISOString(),
				status: 'complete',
				manifest_path: '/mock/manifest.json',
			},
		]
	}
}

export async function fetchRunDetail(runId: string): Promise<ManifestSummary> {
	try {
		const response = await client.get(`/api/runs/${runId}`)
		return response.data
	} catch (error) {
		console.warn('Manifest endpoint unavailable, providing mock data', error)
		return {
			run_id: runId,
			manifest_path: '/mock/manifest.json',
			package_path: '/mock/package.zip',
			package_ready: true,
			summary_text: 'Mock summary generated locally for demo purposes.',
			documents: [
				{
					filename: 'invoice_INV-2002.pdf',
					vendor_id: 'VEND-100',
					amount: 1250.32,
					currency: 'USD',
				},
			],
			journal_entries: [
				{
					entry_id: 'JE-4455',
					invoice_id: 'INV-2002',
					amount: 1250.32,
					status: 'posted',
				},
			],
			anomalies: [
				{
					id: 'ANOM-1',
					label: 'Amount variance',
					severity: 'medium',
					rationale: 'Invoice amount differs from ledger by 2.3%.',
				},
			],
		}
	}
}

export function buildDownloadUrl(runId: string) {
	return `/api/download/${runId}`
}

export async function sendPackage(payload: { run_id: string; email: string }) {
	return client.post('/api/confirm_send', payload)
}

export async function pollStream(runId: string) {
	try {
		const response = await client.get(`/api/stream/${runId}/poll`)
		return response.data
	} catch (error) {
		console.warn('Polling endpoint missing, returning empty queue', error)
		return []
	}
}
