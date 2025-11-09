import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Send, Sparkles } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useStream } from '../hooks/useStream'
import {
  fetchRunDetail,
  pollStream,
  sendPackage,
  startNlQuery,
  type ManifestSummary,
} from '../services/api'
import { AuditSummaryPanel } from '../components/Dashboard/AuditSummaryPanel'
import { EvidenceTable, type EvidenceRecord } from '../components/Dashboard/EvidenceTable'
import { DocumentViewer } from '../components/Dashboard/DocumentViewer'
import { AnomalyPanel, type AnomalyRecord } from '../components/Dashboard/AnomalyPanel'
import { Button } from '../components/shared/Button'

export default function AuditWorkspace() {
  const { user } = useAuth()
  const [query, setQuery] = useState('Prepare audit evidence for vendor VEND-100 including INV-2002.')
  const [email, setEmail] = useState(user?.email ?? '')
  const [runId, setRunId] = useState<string | null>(null)
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [status, setStatus] = useState('Idle')
  const [summary, setSummary] = useState('')
  const [manifestPath, setManifestPath] = useState<string | null>(null)
  const [packageReady, setPackageReady] = useState(false)
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([])
  const [anomalies, setAnomalies] = useState<AnomalyRecord[]>([])
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerRecord, setViewerRecord] = useState<EvidenceRecord | null>(null)
  const [viewerText, setViewerText] = useState<string | undefined>(undefined)
  const [sending, setSending] = useState(false)

  useStream(streamUrl, {
    enabled: Boolean(streamUrl),
    onEvent: (event) => {
      switch (event.event) {
        case 'status':
          setStatus(String(event.payload?.message ?? 'Processing…'))
          break
        case 'summary_chunk':
          if (typeof event.payload?.text === 'string') {
            setSummary((prev) => `${prev}${event.payload?.text}`)
          }
          break
        case 'complete':
          setStatus('Run complete')
          if (typeof event.payload?.manifest_path === 'string') {
            setManifestPath(String(event.payload?.manifest_path))
          }
          if (event.payload?.package_path || event.payload?.package_ready || event.payload?.manifest_path) {
            setPackageReady(true)
          }
          if (runId) {
            void hydrateRunDetails(runId)
          }
          setStreamUrl(null)
          break
        case 'error':
          setStatus(String(event.payload?.message ?? 'Error during orchestration'))
          setStreamUrl(null)
          break
        default:
          break
      }
    },
    poller: runId
      ? () => pollStream(runId).then((events) => {
          if (!Array.isArray(events)) return
          events.forEach((item: { event?: string; payload?: Record<string, unknown> }) => {
            if (item.event === 'summary_chunk' && typeof item.payload?.text === 'string') {
              setSummary((prev) => `${prev}${item.payload?.text}`)
            }
          })
        })
      : undefined,
  })

  const hydrateRunDetails = async (id: string): Promise<ManifestSummary> => {
    const detail = await fetchRunDetail(id)
    setEvidence(
      (detail.documents ?? []).map((doc) => ({
        filename: String(doc.filename ?? doc.name ?? 'document'),
        vendor_id: doc.vendor_id as string | undefined,
        invoice_id: doc.invoice_id as string | undefined,
        amount: typeof doc.amount === 'number' ? doc.amount : undefined,
        currency: (doc.currency as string | undefined) ?? 'USD',
        doc_type: doc.doc_type as string | undefined,
      })),
    )
    setAnomalies(
      (detail.anomalies ?? []).map((anomaly, index) => ({
        id: String(anomaly.id ?? `anomaly-${index}`),
        label: String(anomaly.label ?? 'Anomaly'),
        severity: (anomaly.severity as AnomalyRecord['severity']) ?? 'medium',
        rationale: String(anomaly.rationale ?? 'Mock rationale unavailable.'),
        suggestion: anomaly.suggestion ? String(anomaly.suggestion) : undefined,
      })),
    )
    if (typeof detail.summary_text === 'string') {
      setSummary(detail.summary_text)
    }
    if (typeof (detail as { manifest_path?: string }).manifest_path === 'string') {
      setManifestPath(String((detail as { manifest_path?: string }).manifest_path))
    }
    if (
      (detail as { package_path?: string }).package_path ||
      (detail as { package_ready?: boolean }).package_ready ||
      (detail as { manifest_path?: string }).manifest_path
    ) {
      setPackageReady(true)
    }
    return detail
  }

  useEffect(() => {
    if (!runId || packageReady) return

    let cancelled = false
    let timeoutId: number | undefined

    const pollForCompletion = async () => {
      try {
        const detail = await hydrateRunDetails(runId)
        if (!detail || cancelled) return
        const ready = Boolean(
          (detail as { package_path?: string }).package_path ||
            (detail as { package_ready?: boolean }).package_ready ||
            (detail as { manifest_path?: string }).manifest_path,
        )
        if (ready) {
          setStatus((prev) => (prev.includes('Run complete') ? prev : 'Run complete'))
          return
        }
      } catch (error) {
        console.warn('Run detail still pending', error)
      }
      if (!cancelled) {
        timeoutId = window.setTimeout(pollForCompletion, 4000)
      }
    }

    timeoutId = window.setTimeout(pollForCompletion, 4000)

    return () => {
      cancelled = true
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [runId, packageReady])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('Submitting request…')
    setSummary('')
    setManifestPath(null)
    setPackageReady(false)
    setEvidence([])
    setAnomalies([])

    try {
      const response = await startNlQuery({ text: query, email })
      setRunId(response.run_id)
      setStreamUrl(response.stream_url)
      setStatus('Run started')
    } catch (error) {
      console.error(error)
      setStatus('Unable to start run (mock mode). Generating demo output…')
      const mockChunks = [
        'Initiating reconciliation steps…',
        '\nDocuments collected for vendor VEND-100.',
        '\nLedger entries aligned with invoice INV-2002.',
        '\nNo blocking anomalies detected. Confidence 92%.',
      ]
      mockChunks.forEach((chunk, index) => {
        window.setTimeout(() => setSummary((prev) => `${prev}${chunk}`), index * 600)
      })
      setPackageReady(true)
      setEvidence([
        {
          filename: 'invoice_INV-2002.pdf',
          vendor_id: 'VEND-100',
          invoice_id: 'INV-2002',
          amount: 1250.32,
          currency: 'USD',
        },
      ])
      setAnomalies([
        {
          id: 'ANOM-1',
          label: 'Invoice mismatch',
          severity: 'low',
          rationale: 'Invoice total differs by $5 rounding vs ledger.',
          suggestion: 'Mark as immaterial and close.',
        },
      ])
    }
  }

  const handleSendPackage = async () => {
    if (!runId) return
    setSending(true)
    try {
      await sendPackage({ run_id: runId, email: email || user?.email || 'auditor@example.com' })
      const recipient = email || user?.email || 'auditor@example.com'
      setStatus(`Package sent to ${recipient} (mock)`)
    } catch (error) {
      console.error(error)
      setStatus('Failed to send package; check mock backend logs.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="card">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300" htmlFor="nl-input">
              Natural-language request
            </label>
            <textarea
              id="nl-input"
              value={query}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setQuery(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-slate-200/70 bg-white/95 px-4 py-3 text-sm leading-relaxed shadow-sm focus:border-primary focus:outline-none dark:border-slate-700/70 dark:bg-slate-950/50 dark:text-slate-200"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-500 dark:text-slate-400" htmlFor="notify-email">
              Notification email (optional)
            </label>
            <input
              id="notify-email"
              type="email"
              value={email}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
              placeholder="auditor@example.com"
              className="flex-1 min-w-[180px] rounded-xl border border-slate-200/70 bg-white/95 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none dark:border-slate-700/70 dark:bg-slate-900/70"
            />
            <Button type="submit" icon={<Send className="h-4 w-4" aria-hidden />}>
              Run orchestrator
            </Button>
          </div>
        </form>
      </section>
      <AuditSummaryPanel
        runId={runId}
        summaryMarkdown={summary}
        statusMessage={status}
        manifestPath={manifestPath}
        packageAvailable={packageReady}
        isStreaming={Boolean(streamUrl)}
        onSend={handleSendPackage}
        onDownload={() => (runId ? window.open(`/api/download/${runId}`, '_blank') : undefined)}
      />
      <motion.div layout className="grid gap-6 lg:grid-cols-2">
        <EvidenceTable
          records={evidence}
          onPreview={(record) => {
            setViewerRecord(record)
            setViewerOpen(true)
            setViewerText(
              `Mock preview for ${record.filename}.\nVendor ${record.vendor_id ?? 'N/A'} — Invoice ${
                record.invoice_id ?? 'N/A'
              }.\nContents omitted in mock mode.`,
            )
          }}
        />
        <AnomalyPanel anomalies={anomalies} onAction={(anomaly) => setStatus(`Follow-up created for ${anomaly.label}`)} />
      </motion.div>
      <DocumentViewer open={viewerOpen} record={viewerRecord} textPreview={viewerText} onClose={() => setViewerOpen(false)} />
      <footer className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        Streaming powered by deterministic mock adapters. Toggle `USE_MOCK` flags server-side when ready to integrate real services.
        {sending ? <span className="ml-auto text-primary">Sending package…</span> : null}
      </footer>
    </div>
  )
}
