import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, CalendarDays, Users } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader } from '../shared/Card'
import { cn } from '../../utils/cn'
import { fetchAnomalyHeatmap, type HeatmapMode, type HeatmapResponse } from '../../services/api'

const REFRESH_INTERVAL_MS = 60_000

type FetchState = 'idle' | 'loading' | 'error'

type HeatmapPoint = {
  label: string
  count: number
}

function buildChartData(payload: HeatmapResponse): HeatmapPoint[] {
  return payload.labels.map((label: string, index: number) => ({
    label,
    count: payload.values[index] ?? 0,
  }))
}

function colorForValue(value: number, maxValue: number): string {
  if (maxValue <= 0) {
    return 'rgba(37, 99, 235, 0.18)'
  }
  const ratio = Math.max(0, Math.min(1, value / maxValue))
  const alpha = 0.2 + 0.6 * ratio
  return `rgba(37, 99, 235, ${alpha.toFixed(2)})`
}

export function AnomalyHeatmap() {
  const [mode, setMode] = useState<HeatmapMode>('vendor')
  const [status, setStatus] = useState<FetchState>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [payload, setPayload] = useState<HeatmapResponse>({ labels: [], values: [] })
  const intervalRef = useRef<number | null>(null)

  const loadData = useCallback(async (targetMode: HeatmapMode) => {
    setStatus((prev) => (prev === 'loading' ? prev : 'loading'))
    try {
      const response = await fetchAnomalyHeatmap(targetMode)
      setPayload(response)
      setErrorMessage(null)
      setStatus('idle')
    } catch (error) {
      console.error('Failed to fetch anomaly heatmap', error)
      setErrorMessage('Unable to load anomaly insights. Showing cached data if available.')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void loadData(mode)

    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
    }

    intervalRef.current = window.setInterval(() => {
      void loadData(mode)
    }, REFRESH_INTERVAL_MS)

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
      }
    }
  }, [mode, loadData])

  const chartData = useMemo(() => buildChartData(payload), [payload])
  const maxValue = useMemo(() => chartData.reduce((acc, point) => Math.max(acc, point.count), 0), [chartData])

  const viewControls = (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 p-1 dark:border-slate-700 dark:bg-slate-800/60">
      {(
        [
          { key: 'vendor' as HeatmapMode, label: 'By vendor', icon: Users },
          { key: 'month' as HeatmapMode, label: 'By month', icon: CalendarDays },
        ]
      ).map(({ key, label, icon: Icon }) => {
        const active = mode === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            aria-pressed={active}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-1 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              active
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        )
      })}
    </div>
  )

  const shouldShowSkeleton = status === 'loading' && chartData.length === 0
  const showEmptyState = status !== 'loading' && chartData.length === 0

  return (
    <Card>
      <CardHeader
        title="Anomaly heatmap"
        description="Anomaly density across recent audit runs. Auto-refreshes every minute."
        action={viewControls}
      />
      <CardContent>
        {shouldShowSkeleton ? (
          <div className="flex h-60 items-center justify-center">
            <div className="h-40 w-full max-w-[480px] animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-800/70" />
          </div>
        ) : null}

        {!shouldShowSkeleton && chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.35)" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(37, 99, 235, 0.08)' }}
                  formatter={(value: number) => [`${value} anomalies`, '']}
                  labelFormatter={(label: string) => (mode === 'vendor' ? `Vendor ${label}` : `Month ${label}`)}
                />
                <Bar dataKey="count" radius={[8, 8, 6, 6]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.label} fill={colorForValue(entry.count, maxValue)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <dl className="sr-only">
              {chartData.map((entry) => (
                <div key={entry.label}>
                  <dt>{mode === 'vendor' ? `Vendor ${entry.label}` : `Month ${entry.label}`}</dt>
                  <dd>{`${entry.count} anomalies`}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : null}

        {showEmptyState ? (
          <p className="h-60 text-sm text-slate-400 dark:text-slate-500">
            No anomaly records found in recent audit logs. Run a reconciliation to populate this view.
          </p>
        ) : null}

        {chartData.length > 0 && status === 'error' && errorMessage ? (
          <p className="mt-3 text-xs text-amber-500">{errorMessage}</p>
        ) : null}

        {status === 'error' && chartData.length === 0 && errorMessage ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-600 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            <span>{errorMessage}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default AnomalyHeatmap
