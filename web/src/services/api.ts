import axios from 'axios'
import type { UserRole } from '../constants/routes'

const client = axios.create({
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

export type ConversationMessage = {
	id: string
	role: 'user' | 'assistant'
	text: string
	timestamp?: string
	keywords?: string[]
}

export type ConversationResponse = {
	run_id: string
	messages: ConversationMessage[]
	updated_at?: string
}

export async function fetchRunConversation(runId: string): Promise<ConversationResponse> {
	try {
		const response = await client.get<ConversationResponse>(`/api/runs/${runId}/conversation`)
		return response.data
	} catch (error) {
		if (axios.isAxiosError(error) && error.response?.status === 404) {
			return { run_id: runId, messages: [] }
		}
		console.warn('Conversation endpoint unavailable, returning empty log', error)
		return { run_id: runId, messages: [] }
	}
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

export type StartSimulationPayload = {
	vendor_id?: string
	sample_size?: number
	anomaly_rate?: number
}

export type StartSimulationResponse = {
	run_id: string
	vendor_id: string
	sample_size: number
	anomaly_rate: number
}

export type SimulationRunDetail = {
	run_id: string
	vendor_id: string
	document_count?: number
	anomaly_count?: number
	policy_violation_count?: number
	package_path?: string | null
	report_pdf_path?: string | null
	report_docx_path?: string | null
	comparison?: string
	generated_at?: string
	documents?: Array<Record<string, unknown>>
	anomalies?: Array<Record<string, unknown>>
	policy_violations?: PolicyViolation[]
	chat_history?: Array<Record<string, unknown>>
}

export async function startSimulation(payload: StartSimulationPayload): Promise<StartSimulationResponse> {
	const response = await client.post<StartSimulationResponse>('/api/simulations', payload)
	return response.data
}

export async function fetchSimulationRun(runId: string): Promise<SimulationRunDetail> {
	try {
		const response = await client.get<SimulationRunDetail>(`/api/simulations/${runId}`)
		return response.data
	} catch (error) {
		console.warn('Simulation detail unavailable, returning minimal payload', error)
		return {
			run_id: runId,
			vendor_id: 'VEND-SIM',
			documents: [],
			anomalies: [],
			policy_violations: [],
		}
	}
}

export function buildSimulationStreamUrl(runId: string): string {
	return `/api/simulations/${runId}/stream`
}

export function buildSimulationPackageUrl(runId: string): string {
	return `/api/simulations/${runId}/package`
}

export async function cleanupSimulationRun(runId: string): Promise<void> {
	await client.post(`/api/simulations/${runId}/cleanup`)
}

export type HeatmapMode = 'vendor' | 'month'

export type HeatmapResponse = {
	labels: string[]
	values: number[]
}

export async function fetchAnomalyHeatmap(mode: HeatmapMode): Promise<HeatmapResponse> {
	const response = await client.get<HeatmapResponse>('/api/vendors/heatmap', {
		params: { by: mode },
	})
	return response.data
}

export type PolicyViolation = {
	id: string
	control: string
	control_label?: string
	statement: string
	evidence_excerpt: string
	severity: 'high' | 'medium' | 'low'
	confidence: number
	page?: number
}

export type PolicyCheckResponse = {
	policy_run_id: string
	document_name: string
	controls_evaluated: string[]
	violations: PolicyViolation[]
	summary: string
	analysis_duration_ms: number
	metadata?: {
		pages_processed?: number
		total_tokens?: number
	}
	document_preview?: string
}

export const POLICY_CONTROL_OPTIONS = [
	{ id: 'SOX_404', label: 'SOX 404 Controls' },
	{ id: 'VENDOR_RISK', label: 'Vendor Risk Oversight' },
	{ id: 'RETENTION', label: 'Record Retention' },
	{ id: 'ACCESS_CONTROL', label: 'Access & Least Privilege' },
]

export async function uploadPolicyDocument(payload: { file: File | Blob; controls?: string[] }): Promise<PolicyCheckResponse> {
	const formData = new FormData()
	formData.append('file', payload.file)
	payload.controls?.forEach((control) => {
		if (control) {
			formData.append('controls', control)
		}
	})

	const response = await client.post<PolicyCheckResponse>('/api/policy/check', formData, {
		headers: { 'Content-Type': 'multipart/form-data' },
	})
	return response.data
}

export type NotificationItem = {
	id: string
	type: string
	message: string
	timestamp: string
	read: boolean
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
	try {
		const response = await client.get<{ notifications: NotificationItem[] }>('/api/notifications')
		return response.data?.notifications ?? []
	} catch (error) {
		console.warn('Notifications endpoint unavailable, returning empty list', error)
		return []
	}
}

export async function acknowledgeNotifications(ids: string[]): Promise<{ status: string; updated: number }> {
	const response = await client.post<{ status: string; updated: number }>('/api/notifications/ack', {
		ids,
	})
	return response.data
}

export type ScheduleItem = {
	id: string
	vendor_id: string
	frequency: 'daily' | 'weekly' | 'monthly'
	start_at: string
	created_at: string
	next_run_at?: string | null
	last_run_at?: string | null
	last_run_id?: string | null
}

export type CreateSchedulePayload = {
	vendor_id: string
	frequency: 'daily' | 'weekly' | 'monthly'
	start_date?: string
	start_at?: string
}

export async function fetchSchedules(): Promise<ScheduleItem[]> {
	const response = await client.get<{ schedules: ScheduleItem[] }>('/api/scheduler')
	return response.data?.schedules ?? []
}

export async function createSchedule(payload: CreateSchedulePayload): Promise<ScheduleItem> {
	const response = await client.post<{ schedule: ScheduleItem }>('/api/scheduler', payload)
	return response.data.schedule
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
	await client.delete(`/api/scheduler/${scheduleId}`)
}
