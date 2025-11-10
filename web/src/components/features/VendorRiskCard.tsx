import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader } from '../shared/Card'
import { cn } from '../../utils/cn'
import { ROUTES } from '../../constants/routes'

const REFRESH_INTERVAL_MS = 30_000

type VendorRiskRow = {
  vendor_id: string
  vendor_name?: string
  invoices: number
  anomalies: number
  score: number
}

type FetchState = 'idle' | 'loading' | 'error'

const badgeTone = (score: number) => {
  if (score >= 85) return 'bg-emerald-500/15 text-emerald-600'
  if (score >= 70) return 'bg-amber-500/15 text-amber-600'
  return 'bg-rose-500/15 text-rose-600'
}

export function VendorRiskCard() {
  const navigate = useNavigate()
  const [vendors, setVendors] = useState<VendorRiskRow[]>([])
  const [state, setState] = useState<FetchState>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(
    () => () => {
      isMountedRef.current = false
    },
    [],
  )

  const fetchVendors = useCallback(async () => {
    setState((prev) => (prev === 'idle' ? 'loading' : prev))
    try {
      const response = await fetch('/api/vendors/risk')
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }
      const payload = (await response.json()) as VendorRiskRow[]
      if (!isMountedRef.current) {
        return
      }
      setVendors(payload.sort((a, b) => b.score - a.score))
      setErrorMessage(null)
      setState('idle')
    } catch (error) {
      console.error('Failed to fetch vendor risk metrics', error)
      if (!isMountedRef.current) {
        return
      }
      setErrorMessage('Unable to load vendor risk metrics. Retrying shortly.')
      setState('error')
    }
  }, [])

  useEffect(() => {
    void fetchVendors()

    const intervalId = window.setInterval(() => {
      void fetchVendors()
    }, REFRESH_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [fetchVendors])

  const confidenceByVendor = useMemo(
    () =>
      vendors.reduce<Record<string, number>>((acc, vendor) => {
        const confidence = vendor.invoices > 0 ? Math.max(0, 1 - vendor.anomalies / vendor.invoices) : 1
        acc[vendor.vendor_id] = Math.round(confidence * 100)
        return acc
      }, {}),
    [vendors],
  )

  const handleVendorClick = (vendorId: string) => {
    navigate(`${ROUTES.workspace}?vendor=${encodeURIComponent(vendorId)}`)
  }

  return (
    <Card>
      <CardHeader
        title="Vendor risk scores"
        description="Aggregated risk signals across reconciled vendors. Auto-refreshes every 30 seconds."
        action={
          <button
            type="button"
            onClick={() => fetchVendors()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Refresh vendor risk metrics"
          >
            <RefreshCw className="h-3 w-3" aria-hidden /> Refresh
          </button>
        }
      />
      <CardContent>
        {state === 'loading' && vendors.length === 0 ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/70" />
            ))}
          </div>
        ) : null}
        {state === 'error' && vendors.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-600 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200">
            <AlertTriangle className="h-4 w-4 flex-none" aria-hidden />
            <span>{errorMessage}</span>
          </div>
        ) : null}
        {vendors.length > 0 ? (
          <ul className="space-y-3">
            {vendors.map((vendor) => (
              <li key={vendor.vendor_id}>
                <button
                  type="button"
                  onClick={() => handleVendorClick(vendor.vendor_id)}
                  className="group flex w-full items-center justify-between rounded-2xl border border-slate-200 px-3 py-3 text-left transition hover:border-primary/40 hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-slate-800 dark:hover:border-primary/50 dark:hover:bg-slate-800/60"
                  aria-label={`View detailed runs for ${vendor.vendor_name ?? vendor.vendor_id}`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-100">
                      {vendor.vendor_name ?? vendor.vendor_id}
                    </span>
                    <span className="text-xs text-slate-400">
                      {vendor.vendor_id} · {vendor.invoices} invoice{vendor.invoices === 1 ? '' : 's'} · {vendor.anomalies}{' '}
                      anomaly{vendor.anomalies === 1 ? '' : 'ies'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'inline-flex min-w-[3.5rem] items-center justify-center rounded-full px-2 py-1 text-xs font-semibold',
                        badgeTone(vendor.score),
                      )}
                    >
                      {vendor.score}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-300">
                      {confidenceByVendor[vendor.vendor_id] ?? 100}% confidence
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {vendors.length > 0 && state === 'error' ? (
          <p className="mt-3 text-xs text-amber-500">Showing cached metrics; latest refresh failed.</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default VendorRiskCard
