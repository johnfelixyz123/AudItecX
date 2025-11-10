import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { FileUp, Loader2, ShieldAlert } from 'lucide-react'

import { Button } from '../shared/Button'
import {
	POLICY_CONTROL_OPTIONS,
	uploadPolicyDocument,
	type PolicyCheckResponse,
	type PolicyViolation,
} from '../../services/api'

type PanelStatus = 'idle' | 'loading' | 'success' | 'error'

const STATUS_MESSAGES: Record<PanelStatus, string> = {
	idle: 'Awaiting document upload.',
	loading: 'Analyzing policy document…',
	success: 'Analysis complete.',
	error: 'Unable to analyze document. Retry once the upload succeeds.',
}

type Props = {
	onOpenViolation?: (
		violation: PolicyViolation,
		context: { documentName: string; excerpt: string; page?: number; policyRunId: string },
	) => void
}

export function PolicyCheckPanel({ onOpenViolation }: Props) {
	const fileInputRef = useRef<HTMLInputElement | null>(null)
	const [selectedControls, setSelectedControls] = useState<string[]>(() => POLICY_CONTROL_OPTIONS.map((option) => option.id))
	const [file, setFile] = useState<File | null>(null)
	const [status, setStatus] = useState<PanelStatus>('idle')
	const [error, setError] = useState<string | null>(null)
	const [summary, setSummary] = useState<string>('')
	const [violations, setViolations] = useState<PolicyViolation[]>([])
	const [analysisMeta, setAnalysisMeta] = useState<Pick<PolicyCheckResponse, 'policy_run_id' | 'document_name' | 'analysis_duration_ms' | 'controls_evaluated' | 'metadata' | 'document_preview'> | null>(null)

	const controlsLabel = useMemo(() => {
		const count = selectedControls.length
		if (count === POLICY_CONTROL_OPTIONS.length) return 'All controls'
		if (!count) return 'No controls selected'
		return `${count} control${count === 1 ? '' : 's'} selected`
	}, [selectedControls])

	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const nextFile = event.target.files?.[0] ?? null
		setFile(nextFile)
		setStatus('idle')
		setError(null)
		setSummary('')
		setViolations([])
		setAnalysisMeta(null)
	}

	const toggleControl = (controlId: string) => {
		setSelectedControls((prev) => {
			if (prev.includes(controlId)) {
				return prev.filter((item) => item !== controlId)
			}
			return [...prev, controlId]
		})
	}

	const handleAnalyze = async () => {
		if (!file) {
			setError('Select a policy document before analyzing.')
			return
		}

		setStatus('loading')
		setError(null)

		try {
			const response = await uploadPolicyDocument({ file, controls: selectedControls })
			setViolations(response.violations ?? [])
			setSummary(response.summary ?? '')
			setAnalysisMeta({
				policy_run_id: response.policy_run_id,
				document_name: response.document_name,
				analysis_duration_ms: response.analysis_duration_ms,
				controls_evaluated: response.controls_evaluated,
				metadata: response.metadata,
				document_preview: response.document_preview,
			})
			setStatus('success')
		} catch (err) {
			console.error('Policy analysis failed', err)
			setStatus('error')
			setError('Policy analysis failed. Please retry.')
		}
	}

	const handleViewViolation = (violation: PolicyViolation) => {
		if (!onOpenViolation || !analysisMeta) return
		const excerptLines = [violation.evidence_excerpt]
		if (violation.page) {
			excerptLines.push(`\n(Page ${violation.page})`)
		}
		if (analysisMeta.document_preview && !violation.evidence_excerpt) {
			excerptLines.push('\nDocument preview:\n' + analysisMeta.document_preview.slice(0, 400))
		}
		onOpenViolation(violation, {
			documentName: analysisMeta.document_name,
			excerpt: excerptLines.join(''),
			page: violation.page,
			policyRunId: analysisMeta.policy_run_id,
		})
	}

	return (
		<section className="card">
			<header className="mb-4 flex flex-wrap items-center gap-3">
				<div>
					<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI policy check</h2>
					<p className="text-xs text-slate-500 dark:text-slate-400">Upload a control document to surface missing clauses and violations.</p>
				</div>
				<span className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
					{controlsLabel}
				</span>
			</header>
			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/40">
					<label htmlFor="policy-upload" className="flex cursor-pointer flex-col items-center gap-2 text-center">
						<FileUp className="h-5 w-5 text-primary" aria-hidden />
						<span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Upload policy document</span>
						<span className="text-xs text-slate-500 dark:text-slate-400">Supports PDF or text. Latest file replaces existing selection.</span>
					</label>
					<input
						ref={fileInputRef}
						id="policy-upload"
						type="file"
						accept=".pdf,.txt,.md,.docx,.rtf"
						className="sr-only"
						onChange={handleFileChange}
					/>
					{file ? (
						<p className="text-xs text-slate-600 dark:text-slate-300">Selected: {file.name}</p>
					) : (
						<p className="text-xs italic text-slate-400">No document selected.</p>
					)}
				</div>
				<div className="flex flex-wrap gap-2">
					{POLICY_CONTROL_OPTIONS.map((option) => {
						const active = selectedControls.includes(option.id)
						return (
							<button
								key={option.id}
								type="button"
								onClick={() => toggleControl(option.id)}
								className={`rounded-full px-3 py-1 text-xs font-semibold transition ${active ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-600 dark:bg-slate-900/50 dark:text-slate-300'}`}
							>
								{option.label}
							</button>
						)
					})}
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<Button type="button" variant="primary" disabled={!file || status === 'loading'} onClick={handleAnalyze}
						icon={status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldAlert className="h-4 w-4" aria-hidden />}>
						Analyze document
					</Button>
					<button
						type="button"
						className="text-xs text-slate-500 underline hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
						onClick={() => {
							setSelectedControls(POLICY_CONTROL_OPTIONS.map((option) => option.id))
						}}
					>
						Reset controls
					</button>
					{file ? (
						<button
							type="button"
							className="text-xs text-slate-500 underline hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
							onClick={() => {
								setFile(null)
								if (fileInputRef.current) {
									fileInputRef.current.value = ''
								}
							}}
						>
							Clear file
						</button>
					) : null}
				</div>
				<div className="text-xs text-slate-500 dark:text-slate-400" role="status" aria-live="polite">
					{STATUS_MESSAGES[status]}
				</div>
				{error ? <p className="text-xs text-red-500">{error}</p> : null}
			</div>
			{summary ? (
				<div className="mt-5 space-y-4">
					<div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm leading-relaxed text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
						{summary}
					</div>
					{analysisMeta ? (
						<ul className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
							<li>Run: {analysisMeta.policy_run_id}</li>
							<li>Document: {analysisMeta.document_name}</li>
							<li>Duration: {analysisMeta.analysis_duration_ms} ms</li>
							{analysisMeta.metadata?.total_tokens ? <li>Tokens: {analysisMeta.metadata.total_tokens}</li> : null}
							{analysisMeta.metadata?.pages_processed ? <li>Pages: {analysisMeta.metadata.pages_processed}</li> : null}
						</ul>
					) : null}
					<div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
						<table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
							<thead className="bg-slate-100/70 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900/60">
								<tr>
									<th className="px-4 py-3 text-left">Control</th>
									<th className="px-4 py-3 text-left">Issue</th>
									<th className="px-4 py-3 text-left">Severity</th>
									<th className="px-4 py-3 text-left">Confidence</th>
									<th className="px-4 py-3 text-right" />
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950/30">
								{violations.length ? (
									violations.map((violation) => (
										<tr key={violation.id}>
											<td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
												{violation.control_label ?? violation.control}
											</td>
											<td className="px-4 py-3 text-slate-600 dark:text-slate-300">{violation.statement}</td>
											<td className="px-4 py-3">
												<span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold uppercase ${badgeClassForSeverity(violation.severity)}`}>
													{violation.severity}
												</span>
											</td>
											<td className="px-4 py-3 text-slate-600 dark:text-slate-300">{Math.round(violation.confidence * 100)}%</td>
											<td className="px-4 py-3 text-right">
												<Button type="button" variant="ghost" onClick={() => handleViewViolation(violation)}>
													View snippet
												</Button>
											</td>
										</tr>
									))
								) : (
									<tr>
										<td colSpan={5} className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
											No issues detected.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
					{analysisMeta?.document_preview ? (
						<div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-200">
							<p className="mb-2 font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Document preview</p>
							<pre className="max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
								{analysisMeta.document_preview}
							</pre>
						</div>
					) : null}
				</div>
			) : null}
		</section>
	)
}

function badgeClassForSeverity(severity: PolicyViolation['severity']): string {
	switch (severity) {
		case 'high':
			return 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-200'
		case 'medium':
			return 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-200'
		default:
			return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-200'
	}
}
