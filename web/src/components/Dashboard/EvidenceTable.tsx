import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search } from 'lucide-react'
import { Button } from '../shared/Button'

export type EvidenceRecord = {
	filename: string
	vendor_id?: string
	invoice_id?: string
	amount?: number
	currency?: string
	doc_type?: string
}

type Props = {
	records: EvidenceRecord[]
	onPreview: (record: EvidenceRecord) => void
}

export function EvidenceTable({ records, onPreview }: Props) {
	const [query, setQuery] = useState('')

	const filtered = useMemo(() => {
		if (!query) return records
		return records.filter((record) =>
			Object.values(record)
				.join(' ')
				.toLowerCase()
				.includes(query.toLowerCase()),
		)
	}, [records, query])

	return (
		<section className="card">
			<header className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Evidence explorer</h2>
					<p className="text-xs text-slate-500 dark:text-slate-400">Documents included in the current run.</p>
				</div>
				<label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
					<Search className="h-4 w-4 text-slate-400" aria-hidden />
					<input
						type="search"
						placeholder="Filter by vendor, invoice, amount…"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						className="border-0 bg-transparent outline-none"
					/>
				</label>
			</header>
			<div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
				<table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
					<thead className="bg-slate-100/70 dark:bg-slate-900/60">
						<tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
							<th className="px-4 py-3">File</th>
							<th className="px-4 py-3">Vendor</th>
							<th className="px-4 py-3">Invoice</th>
							<th className="px-4 py-3">Amount</th>
							<th className="px-4 py-3" />
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200 bg-white text-sm dark:divide-slate-800 dark:bg-slate-950/30">
						<AnimatePresence initial={false}>
							{filtered.map((record) => (
								<motion.tr
									key={record.filename}
									initial={{ opacity: 0, y: 6 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -6 }}
									transition={{ duration: 0.2 }}
								>
									<td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{record.filename}</td>
									<td className="px-4 py-3 text-slate-500 dark:text-slate-300">{record.vendor_id ?? '—'}</td>
									<td className="px-4 py-3 text-slate-500 dark:text-slate-300">{record.invoice_id ?? '—'}</td>
									<td className="px-4 py-3 text-slate-500 dark:text-slate-300">
										{record.amount ? `${record.currency ?? 'USD'} ${record.amount.toLocaleString()}` : '—'}
									</td>
									<td className="px-4 py-3 text-right">
										<Button
											type="button"
											variant="ghost"
											onClick={() => onPreview(record)}
											className="text-primary"
										>
											Preview
										</Button>
									</td>
								</motion.tr>
							))}
						</AnimatePresence>
						{filtered.length === 0 ? (
							<tr>
								<td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
									No evidence records match your filter.
								</td>
							</tr>
						) : null}
					</tbody>
				</table>
			</div>
		</section>
	)
}
