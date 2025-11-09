import { Card, CardContent, CardHeader } from '../components/shared/Card'
import { ChartInsights } from '../components/Dashboard/ChartInsights'

export default function DashboardCompliance() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-slate-400">Compliance overview</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Policy and control monitoring</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Track audit coverage, anomalies, and overall control health to maintain compliance readiness.
        </p>
      </header>
      <ChartInsights />
      <Card>
        <CardHeader title="Upcoming obligations" description="Key control reviews scheduled for this quarter." />
        <CardContent>
          <ul className="grid gap-3 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <li key={item} className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
                Control #{item} · Third-party risk review — Due in {item * 5} days
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
