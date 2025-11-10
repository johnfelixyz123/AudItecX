import { useCallback, useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Send, Sparkles } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useStream } from '../hooks/useStream'
import {
  fetchRunConversation,
  fetchRunDetail,
  fetchSimulationRun,
  buildSimulationPackageUrl,
  buildSimulationStreamUrl,
  cleanupSimulationRun,
  pollStream,
  sendPackage,
  startNlQuery,
  startSimulation,
  type ConversationMessage,
  type ManifestSummary,
  type PolicyViolation,
} from '../services/api'
import { AuditSummaryPanel } from '../components/Dashboard/AuditSummaryPanel'
import { EvidenceTable, type EvidenceRecord } from '../components/Dashboard/EvidenceTable'
import { DocumentViewer } from '../components/Dashboard/DocumentViewer'
import { AnomalyPanel, type AnomalyRecord } from '../components/Dashboard/AnomalyPanel'
import { Button } from '../components/shared/Button'
import { AuditChatTimeline } from '../components/features/AuditChatTimeline'
import { PolicyCheckPanel } from '../components/features/PolicyCheckPanel'

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
  const [conversation, setConversation] = useState<ConversationMessage[]>([])
  const [conversationLoading, setConversationLoading] = useState(false)
  const [simVendor, setSimVendor] = useState('VEND-SIM-101')
  const [simSampleSize, setSimSampleSize] = useState(16)
  const [simAnomalyRate, setSimAnomalyRate] = useState(0.3)
  const [simRunId, setSimRunId] = useState<string | null>(null)
  const [simStreamUrl, setSimStreamUrl] = useState<string | null>(null)
  const [simStatus, setSimStatus] = useState('Simulation idle')
  const [simSummary, setSimSummary] = useState('')
  const [simEvidence, setSimEvidence] = useState<EvidenceRecord[]>([])
  const [simAnomalies, setSimAnomalies] = useState<AnomalyRecord[]>([])
  const [simViolations, setSimViolations] = useState<PolicyViolation[]>([])
  const [simPackagePath, setSimPackagePath] = useState<string | null>(null)
  const [simReports, setSimReports] = useState<{ pdf: string | null; docx: string | null }>({ pdf: null, docx: null })
  const [simChat, setSimChat] = useState<ConversationMessage[]>([])
  const [simDocumentMap, setSimDocumentMap] = useState<Record<string, Record<string, unknown>>>({})
  const [simHistoryLoading, setSimHistoryLoading] = useState(false)

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
            setConversation((prev) => {
              if (!prev.length) {
                return prev
              }
              const next = [...prev]
              const assistantIndex = next.findIndex((message) => message.role === 'assistant')
              const chunk = String(event.payload?.text)
              if (assistantIndex >= 0) {
                const existing = next[assistantIndex]
                next[assistantIndex] = {
                  ...existing,
                  text: `${existing.text ?? ''}${chunk}`,
                  timestamp: new Date().toISOString(),
                }
              } else {
                next.push({
                  id: `${runId ?? 'pending'}-assistant`,
                  role: 'assistant',
                  text: chunk,
                  timestamp: new Date().toISOString(),
                })
              }
              return next
            })
            setConversationLoading(false)
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
            void hydrateConversation(runId, { preserveExisting: true })
          }
          setStreamUrl(null)
          break
        case 'error':
          setStatus(String(event.payload?.message ?? 'Error during orchestration'))
          setConversationLoading(false)
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
              setConversation((prev) => {
                if (!prev.length) {
                  return prev
                }
                const next = [...prev]
                const assistantIndex = next.findIndex((message) => message.role === 'assistant')
                const chunk = String(item.payload?.text)
                if (assistantIndex >= 0) {
                  const existing = next[assistantIndex]
                  next[assistantIndex] = {
                    ...existing,
                    text: `${existing.text ?? ''}${chunk}`,
                    timestamp: new Date().toISOString(),
                  }
                } else {
                  next.push({
                    id: `${runId ?? 'pending'}-assistant`,
                    role: 'assistant',
                    text: chunk,
                    timestamp: new Date().toISOString(),
                  })
                }
                return next
              })
              setConversationLoading(false)
            }
          })
        })
      : undefined,
  })

  useStream(simStreamUrl, {
    enabled: Boolean(simStreamUrl),
    onEvent: (event) => {
      const eventType = event.event ?? 'message'
      const payload = (event.payload ?? {}) as Record<string, unknown>
      const appendNote = (note: string) => {
        setSimSummary((prev) => (prev ? `${prev}\n${note}` : note))
      }

      switch (eventType) {
        case 'status': {
          if (typeof payload.message === 'string') {
            setSimStatus(payload.message)
            appendNote(payload.message)
          }
          break
        }
        case 'documents_ready': {
          const count = typeof payload.count === 'number' ? payload.count : undefined
          const message = count ? `Generated ${count} synthetic documents.` : 'Synthetic documents ready.'
          setSimStatus(message)
          appendNote(message)
          break
        }
        case 'anomalies_detected': {
          const count = typeof payload.count === 'number' ? payload.count : undefined
          const message = count ? `Detected ${count} anomalies.` : 'Anomaly detection complete.'
          setSimStatus(message)
          appendNote(message)
          break
        }
        case 'chat_seeded': {
          const message = 'Conversation timeline seeded.'
          setSimStatus(message)
          appendNote(message)
          break
        }
        case 'policy_assessed': {
          const count = typeof payload.count === 'number' ? payload.count : undefined
          const message = count ? `Policy assessment generated ${count} findings.` : 'Policy assessment completed.'
          setSimStatus(message)
          appendNote(message)
          break
        }
        case 'package_ready': {
          const path = typeof payload.path === 'string' ? payload.path : null
          if (path) {
            setSimPackagePath(path)
            appendNote('Simulation package assembled.')
          }
          break
        }
        case 'reports_ready': {
          const pdf = typeof payload.pdf === 'string' ? payload.pdf : null
          const docx = typeof payload.docx === 'string' ? payload.docx : null
          setSimReports((prev) => ({
            pdf: pdf ?? prev.pdf,
            docx: docx ?? prev.docx,
          }))
          appendNote('Report assets exported.')
          break
        }
        case 'completed': {
          const completedRunId = typeof payload.run_id === 'string' ? payload.run_id : simRunId
          setSimStatus('Simulation complete')
          const lines = [
            `Simulation complete for ${typeof payload.vendor_id === 'string' ? payload.vendor_id : simVendor}.`,
            `Documents processed: ${typeof payload.document_count === 'number' ? payload.document_count : 'n/a'}.`,
            `Anomalies detected: ${typeof payload.anomaly_count === 'number' ? payload.anomaly_count : 'n/a'}.`,
            `Policy violations: ${typeof payload.policy_violation_count === 'number' ? payload.policy_violation_count : 'n/a'}.`,
            typeof payload.comparison === 'string' ? `Comparison: ${payload.comparison}` : null,
          ].filter(Boolean) as string[]
          setSimSummary(lines.join('\n'))
          setSimReports((prev) => ({
            pdf: typeof payload.report_pdf_path === 'string' ? payload.report_pdf_path : prev.pdf,
            docx: typeof payload.report_docx_path === 'string' ? payload.report_docx_path : prev.docx,
          }))
          if (typeof payload.package_path === 'string') {
            setSimPackagePath(payload.package_path)
          }
          if (completedRunId) {
            setSimRunId(completedRunId)
            void hydrateSimulationDetail(completedRunId)
          }
          setSimStreamUrl(null)
          break
        }
        case 'error': {
          const message = typeof payload.message === 'string' ? payload.message : 'Simulation encountered an error.'
          setSimStatus(message)
          appendNote(message)
          setSimStreamUrl(null)
          break
        }
        default:
          break
      }
    },
  })

  const hydrateRunDetails = useCallback(async (id: string): Promise<ManifestSummary> => {
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
  }, [])

  const hydrateConversation = useCallback(
    async (id: string, options?: { preserveExisting?: boolean }): Promise<void> => {
      const preserveExisting = options?.preserveExisting ?? false
      setConversationLoading(true)
      try {
        const payload = await fetchRunConversation(id)
        if (payload.messages?.length) {
          setConversation(payload.messages)
        } else if (!preserveExisting) {
          setConversation([])
        }
      } catch (error) {
        console.warn('Conversation not available yet', error)
        if (!preserveExisting) {
          setConversation([])
        }
      } finally {
        setConversationLoading(false)
      }
    },
    [],
  )

  const hydrateSimulationDetail = useCallback(
    async (id: string): Promise<void> => {
      setSimHistoryLoading(true)
      try {
        const detail = await fetchSimulationRun(id)
        const documents = Array.isArray(detail.documents) ? detail.documents : []
        const docMap: Record<string, Record<string, unknown>> = {}
        const mappedEvidence = documents.map((raw, index) => {
          const record = (raw ?? {}) as Record<string, unknown>
          const docId = typeof record.doc_id === 'string'
            ? record.doc_id
            : typeof record.filename === 'string'
              ? record.filename
              : `SIM-DOC-${index}`
          docMap[docId] = record
          return {
            filename: docId,
            vendor_id:
              typeof record.vendor_id === 'string'
                ? record.vendor_id
                : detail.vendor_id,
            invoice_id: docId,
            amount: typeof record.amount === 'number' ? record.amount : undefined,
            currency: typeof record.currency === 'string' ? record.currency : 'USD',
            doc_type: typeof record.doc_type === 'string' ? record.doc_type : undefined,
          }
        })
        setSimDocumentMap(docMap)
        setSimEvidence(mappedEvidence)

        const toSeverity = (value: unknown): AnomalyRecord['severity'] => {
          if (value === 'high' || value === 'medium' || value === 'low') {
            return value
          }
          return 'medium'
        }

        const mappedAnomalies = (Array.isArray(detail.anomalies) ? detail.anomalies : []).map((raw, index) => {
          const anomaly = (raw ?? {}) as Record<string, unknown>
          const label = typeof anomaly.label === 'string' ? anomaly.label : 'Anomaly'
          return {
            id: typeof anomaly.id === 'string' ? anomaly.id : `sim-anomaly-${index}`,
            label,
            severity: toSeverity(anomaly.severity),
            rationale: typeof anomaly.rationale === 'string' ? anomaly.rationale : `${label} detected during simulation`,
            suggestion: typeof anomaly.suggestion === 'string' ? anomaly.suggestion : undefined,
          }
        })
        setSimAnomalies(mappedAnomalies)

        setSimViolations(Array.isArray(detail.policy_violations) ? (detail.policy_violations as PolicyViolation[]) : [])

        if (Array.isArray(detail.chat_history)) {
          const mappedChat = detail.chat_history
            .map((entry, index) => {
              const message = (entry ?? {}) as Record<string, unknown>
              const text = typeof message.text === 'string' ? message.text : ''
              if (!text) return null
              const role = message.role === 'assistant' ? 'assistant' : 'user'
              const keywords = Array.isArray(message.keywords)
                ? (message.keywords.filter((item): item is string => typeof item === 'string'))
                : undefined
              return {
                id: typeof message.id === 'string' ? message.id : `${id}-${role}-${index}`,
                role,
                text,
                timestamp: typeof message.timestamp === 'string' ? message.timestamp : undefined,
                keywords,
              }
            })
            .filter(Boolean) as ConversationMessage[]
          setSimChat(mappedChat)
        } else {
          setSimChat([])
        }

        if (typeof detail.package_path === 'string') {
          setSimPackagePath(detail.package_path)
        }
        setSimReports((prev) => ({
          pdf: typeof detail.report_pdf_path === 'string' ? detail.report_pdf_path : prev.pdf,
          docx: typeof detail.report_docx_path === 'string' ? detail.report_docx_path : prev.docx,
        }))

        setSimSummary((prev) => {
          if (prev) return prev
          const lines = [
            `Simulation ${id} summary`,
            `Vendor: ${detail.vendor_id}`,
            `Documents processed: ${detail.document_count ?? documents.length}`,
            `Anomalies detected: ${detail.anomaly_count ?? mappedAnomalies.length}`,
            `Policy violations: ${detail.policy_violation_count ?? (detail.policy_violations?.length ?? 0)}`,
            detail.comparison ? `Comparison vs prior: ${detail.comparison}` : null,
          ].filter(Boolean) as string[]
          return lines.join('\n')
        })

        setSimStatus((prev) => (prev.includes('complete') ? prev : 'Simulation data ready'))
      } catch (error) {
        console.warn('Unable to hydrate simulation detail', error)
      } finally {
        setSimHistoryLoading(false)
      }
    },
    [],
  )

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
          void hydrateConversation(runId, { preserveExisting: true })
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
  }, [runId, packageReady, hydrateRunDetails, hydrateConversation])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('Submitting request…')
    setSummary('')
    setManifestPath(null)
    setPackageReady(false)
    setEvidence([])
    setAnomalies([])
    const submittedAt = new Date().toISOString()
    setConversation([
      {
        id: `local-user-${Date.now()}`,
        role: 'user',
        text: query,
        timestamp: submittedAt,
      },
    ])
    setConversationLoading(true)

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
      const assistantMock = mockChunks.join('')
      setConversation([
        {
          id: `mock-user-${Date.now()}`,
          role: 'user',
          text: query,
          timestamp: submittedAt,
        },
        {
          id: `mock-assistant-${Date.now()}`,
          role: 'assistant',
          text: assistantMock,
          timestamp: new Date().toISOString(),
        },
      ])
      setConversationLoading(false)
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

  const handleStartSimulation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSimStatus('Launching simulation…')
    setSimSummary('')
    setSimEvidence([])
    setSimAnomalies([])
    setSimViolations([])
    setSimPackagePath(null)
    setSimReports({ pdf: null, docx: null })
    setSimChat([])
    setSimDocumentMap({})

    try {
      const response = await startSimulation({
        vendor_id: simVendor,
        sample_size: simSampleSize,
        anomaly_rate: simAnomalyRate,
      })
      setSimRunId(response.run_id)
      setSimStreamUrl(buildSimulationStreamUrl(response.run_id))
      setSimSummary(`Simulation started for ${response.vendor_id}.`)
      setSimStatus('Simulation running…')
    } catch (error) {
      console.error('Failed to start simulation', error)
      setSimStatus('Failed to start simulation run.')
      setSimSummary((prev) => (prev ? `${prev}\nSimulation failed to start.` : 'Simulation failed to start.'))
    }
  }

  const handleSimulationDownload = () => {
    if (!simRunId) return
    window.open(buildSimulationPackageUrl(simRunId), '_blank')
  }

  const handleSimulationCleanup = async () => {
    if (!simRunId) return
    try {
      await cleanupSimulationRun(simRunId)
      setSimStatus('Simulation artifacts cleared.')
      setSimSummary('')
      setSimEvidence([])
      setSimAnomalies([])
      setSimViolations([])
      setSimPackagePath(null)
      setSimReports({ pdf: null, docx: null })
      setSimChat([])
      setSimDocumentMap({})
      setSimRunId(null)
      setSimStreamUrl(null)
    } catch (error) {
      console.error('Failed to clean up simulation artifacts', error)
      setSimStatus('Failed to clean up simulation artifacts; see console for details.')
    }
  }

  const handleSimulationPreview = useCallback(
    (record: EvidenceRecord) => {
      setViewerRecord(record)
      const metadata = simDocumentMap[record.filename]
      if (metadata) {
        setViewerText(JSON.stringify(metadata, null, 2))
      } else {
        setViewerText(`Synthetic evidence placeholder for ${record.filename}`)
      }
      setViewerOpen(true)
    },
    [simDocumentMap],
  )

  const simulationHasResults = Boolean(
    simSummary ||
      simEvidence.length ||
      simAnomalies.length ||
      simViolations.length ||
      simChat.length,
  )

  const violationBadgeClass = (severity: PolicyViolation['severity']) => {
    switch (severity) {
      case 'high':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
      case 'medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
      default:
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
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
      <AuditChatTimeline
        runId={runId}
        messages={conversation}
        isLoading={conversationLoading}
        onRefresh={runId ? () => hydrateConversation(runId) : undefined}
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
      <section className="card">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Full-spectrum simulation mode</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generate deterministic evidence packs, anomalies, and policy flags for demo walkthroughs.
            </p>
          </div>
          {simRunId ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-900/60 dark:text-slate-300">
              Run {simRunId}
            </span>
          ) : null}
        </header>
        <form className="grid gap-4 md:grid-cols-4" onSubmit={handleStartSimulation}>
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300" htmlFor="sim-vendor">
              Vendor ID
            </label>
            <input
              id="sim-vendor"
              type="text"
              value={simVendor}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSimVendor(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200/70 bg-white/95 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-200"
              placeholder="VEND-SIM-101"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300" htmlFor="sim-size">
              Sample size
            </label>
            <input
              id="sim-size"
              type="number"
              min={1}
              max={200}
              value={simSampleSize}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                const next = Number(event.target.value)
                if (Number.isNaN(next)) {
                  setSimSampleSize(1)
                } else {
                  setSimSampleSize(Math.max(1, Math.min(200, Math.round(next))))
                }
              }}
              className="mt-1 w-full rounded-xl border border-slate-200/70 bg-white/95 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300" htmlFor="sim-rate">
              Anomaly rate
            </label>
            <input
              id="sim-rate"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={simAnomalyRate}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                const next = Number(event.target.value)
                if (Number.isNaN(next)) {
                  setSimAnomalyRate(0)
                } else {
                  const clamped = Math.max(0, Math.min(1, Math.round(next * 100) / 100))
                  setSimAnomalyRate(clamped)
                }
              }}
              className="mt-1 w-full rounded-xl border border-slate-200/70 bg-white/95 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-200"
            />
          </div>
          <div className="md:col-span-4 flex flex-wrap gap-3">
            <Button type="submit" icon={<Sparkles className="h-4 w-4" aria-hidden />}>
              Start simulation
            </Button>
            {simRunId ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!simPackagePath}
                  onClick={handleSimulationDownload}
                >
                  Download package
                </Button>
                <Button type="button" variant="ghost" onClick={handleSimulationCleanup}>
                  Clear artifacts
                </Button>
              </>
            ) : null}
          </div>
        </form>
        <div className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Status:{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{simStatus}</span>
          </div>
          {simPackagePath ? (
            <div>
              Package path:
              {' '}
              <code className="ml-1 break-all text-[0.7rem] text-slate-600 dark:text-slate-300">{simPackagePath}</code>
            </div>
          ) : null}
          {(simReports.pdf || simReports.docx) ? (
            <ul className="space-y-1">
              {simReports.pdf ? (
                <li>
                  Report PDF:
                  {' '}
                  <code className="ml-1 break-all text-[0.7rem] text-slate-600 dark:text-slate-300">{simReports.pdf}</code>
                </li>
              ) : null}
              {simReports.docx ? (
                <li>
                  Report DOCX:
                  {' '}
                  <code className="ml-1 break-all text-[0.7rem] text-slate-600 dark:text-slate-300">{simReports.docx}</code>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
        {simSummary ? (
          <pre className="mt-4 max-h-44 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200">
            {simSummary}
          </pre>
        ) : null}
      </section>
      {simulationHasResults ? (
        <>
          <AuditChatTimeline
            runId={simRunId}
            messages={simChat}
            isLoading={simHistoryLoading}
            onRefresh={simRunId ? () => hydrateSimulationDetail(simRunId) : undefined}
          />
          <motion.div layout className="grid gap-6 lg:grid-cols-2">
            <EvidenceTable records={simEvidence} onPreview={handleSimulationPreview} />
            <AnomalyPanel
              anomalies={simAnomalies}
              onAction={(anomaly) => setSimStatus(`Simulation follow-up created for ${anomaly.label}`)}
            />
          </motion.div>
          {simViolations.length ? (
            <section className="card">
              <header className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Simulation policy findings</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Controls flagged during synthetic policy evaluation.</p>
              </header>
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="bg-slate-100/70 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900/60">
                    <tr>
                      <th className="px-4 py-3 text-left">Control</th>
                      <th className="px-4 py-3 text-left">Issue</th>
                      <th className="px-4 py-3 text-left">Severity</th>
                      <th className="px-4 py-3 text-right" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950/30">
                    {simViolations.map((violation) => (
                      <tr key={violation.id}>
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                          {violation.control_label ?? violation.control}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{violation.statement}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold uppercase ${violationBadgeClass(violation.severity)}`}>
                            {violation.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setViewerRecord({ filename: violation.control_label ?? violation.control, doc_type: 'Policy control' })
                              const lines = [violation.statement, '', violation.evidence_excerpt ?? '']
                              if (violation.page) {
                                lines.push(`Page ${violation.page}`)
                              }
                              setViewerText(lines.filter(Boolean).join('\n'))
                              setViewerOpen(true)
                            }}
                          >
                            View detail
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
      <PolicyCheckPanel
        onOpenViolation={(violation, context) => {
          setStatus(`Policy violation flagged: ${violation.control_label ?? violation.control}`)
          setViewerRecord({
            filename: context.documentName,
            doc_type: 'Policy document',
          })
          const detailLines = [violation.statement, '', context.excerpt.trim()]
          if (context.page) {
            detailLines.push(`Page ${context.page}`)
          }
          detailLines.push(`Run: ${context.policyRunId}`)
          setViewerText(detailLines.filter(Boolean).join('\n'))
          setViewerOpen(true)
        }}
      />
      <DocumentViewer open={viewerOpen} record={viewerRecord} textPreview={viewerText} onClose={() => setViewerOpen(false)} />
      <footer className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        Streaming powered by deterministic mock adapters. Toggle `USE_MOCK` flags server-side when ready to integrate real services.
        {sending ? <span className="ml-auto text-primary">Sending package…</span> : null}
      </footer>
    </div>
  )
}
