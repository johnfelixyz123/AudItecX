import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock3 } from 'lucide-react'
import { fetchRuns } from '../services/api'

export type RunRecord = {
  run_id: string
  intent?: string
  created_at?: string
  status?: string
  manifest_path?: string
}

export default function RunHistoryPage() {
  const [runs, setRuns] = useState<RunRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const data = await fetchRuns()
        if (isMounted) {
          setRuns(Array.isArray(data) ? (data as RunRecord[]) : [])
        }
      } catch (error) {
        console.error('Unable to load run history', error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="card">
      <header className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Clock3 className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Recent Runs</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track orchestration activity and inspect manifests.</p>
        </div>
      </header>
      {loading ? (
        <p className="text-sm text-slate-500">Loading run history…</p>
      ) : runs.length === 0 ? (
        <p className="text-sm text-slate-500">No runs found yet. Trigger your first orchestration from the workspace.</p>
      ) : (
        <motion.ul className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {runs.map((run) => (
            <li key={run.run_id} className="rounded-2xl border border-slate-200/70 bg-white/95 px-4 py-3 text-sm shadow-sm transition hover:border-primary/40 hover:shadow-md dark:border-slate-700/70 dark:bg-slate-900/70">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-100">{run.run_id}</span>
                {run.status ? (
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium capitalize text-primary">{run.status}</span>
                ) : null}
                {run.intent ? <span className="text-xs text-slate-400">Intent: {run.intent}</span> : null}
                {run.created_at ? (
                  <span className="ml-auto text-xs text-slate-400">
                    {new Date(run.created_at).toLocaleString()}
                  </span>
                ) : null}
              </div>
              {run.manifest_path ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Manifest: {run.manifest_path}</p>
              ) : null}
            </li>
          ))}
        </motion.ul>
      )}
    </section>
  )
}
