import { Modal } from '../shared/Modal'
import type { EvidenceRecord } from './EvidenceTable'

type Props = {
	open: boolean
	record: EvidenceRecord | null
	textPreview?: string
	onClose: () => void
}

export function DocumentViewer({ open, record, textPreview, onClose }: Props) {
	return (
		<Modal open={open} onClose={onClose} title={record?.filename ?? 'Document preview'}>
			{record ? (
				<dl className="grid grid-cols-2 gap-3 text-sm">
					<div>
						<dt className="text-xs uppercase text-slate-400">Vendor</dt>
						<dd className="font-medium text-slate-700 dark:text-slate-200">{record.vendor_id ?? '—'}</dd>
					</div>
					<div>
						<dt className="text-xs uppercase text-slate-400">Invoice</dt>
						<dd className="font-medium text-slate-700 dark:text-slate-200">{record.invoice_id ?? '—'}</dd>
					</div>
					<div>
						<dt className="text-xs uppercase text-slate-400">Amount</dt>
						<dd className="font-medium text-slate-700 dark:text-slate-200">
							{record.amount ? `${record.currency ?? 'USD'} ${record.amount.toLocaleString()}` : '—'}
						</dd>
					</div>
					<div>
						<dt className="text-xs uppercase text-slate-400">Type</dt>
						<dd className="font-medium text-slate-700 dark:text-slate-200">{record.doc_type ?? 'Document'}</dd>
					</div>
				</dl>
			) : null}
			<div className="mt-4 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
				<pre className="whitespace-pre-wrap text-xs leading-relaxed">
					{textPreview || 'Mock preview unavailable. Uploads disabled in demo mode.'}
				</pre>
			</div>
		</Modal>
	)
}
