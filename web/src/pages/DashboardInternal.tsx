import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { KPIGroup } from '../components/Dashboard/KPIGroup'
import { ChartInsights } from '../components/Dashboard/ChartInsights'
import { Card, CardContent, CardHeader } from '../components/shared/Card'
import { ROUTES } from '../constants/routes'
import { VendorRiskCard } from '../components/features/VendorRiskCard'
import { AnomalyHeatmap } from '../components/features/AnomalyHeatmap'

export default function DashboardInternal() {
  const stats = useMemo(
    () => [
      { label: 'Runs this week', value: '12', delta: 8, helper: 'Your team is up 8% vs last week.' },
      { label: 'Evidence packages', value: '34', delta: 12, helper: 'Ready for review.' },
      { label: 'Open anomalies', value: '5', delta: -2, helper: 'Down 2 vs prior period.' },
      { label: 'Average confidence', value: '92%', helper: 'Baseline confidence remains high.' },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-slate-400">Internal Auditor</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Welcome back</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Launch new reconciliations, track anomalies, and review packaging readiness at a glance.
        </p>
      </header>
      <KPIGroup stats={stats} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Recent runs" description="Latest reconciliations with status." />
          <CardContent>
            <ul className="space-y-3 text-sm">
              {[1, 2, 3].map((item) => (
                <li key={item} className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-3 dark:border-slate-800">
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-200">Run #{2310 + item} · Vendors VEND-10{item}</p>
                    <p className="text-xs text-slate-400">Completed {item} hours ago</p>
                  </div>
                  <Link to={ROUTES.workspace} className="inline-flex items-center gap-2 text-sm text-primary">
                    Review <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Start new audit" description="Kick off a new reconciliation workflow." />
          <CardContent>
            <div className="space-y-4 text-sm">
              <p>Use the natural language orchestrator to launch a new run with deterministic mock data.</p>
              <Link
                to={ROUTES.workspace}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-600"
              >
                Launch orchestrator
              </Link>
              <p className="text-xs text-slate-400">Tip: Try “Prepare evidence for vendor VEND-100 including INV-2002.”</p>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <VendorRiskCard />
        <AnomalyHeatmap />
      </div>
      <ChartInsights />
    </div>
  )
}
