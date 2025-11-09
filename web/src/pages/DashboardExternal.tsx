import { Link } from 'react-router-dom'
import { Download, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader } from '../components/shared/Card'

export default function DashboardExternal() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-slate-400">External Auditor</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Evidence packages assigned to you</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Download ready-to-review packages and mark-off reconciliations shared by the internal team.
        </p>
      </header>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Pending reviews" description="Packages waiting on external sign-off." />
          <CardContent>
            <ul className="space-y-3 text-sm">
              {[1, 2].map((item) => (
                <li key={item} className="flex items-center justify-between rounded-2xl border border-slate-200 px-3 py-3 dark:border-slate-800">
                  <div>
                    <p className="font-medium text-slate-700 dark:text-slate-200">Package #{210 + item} — Vendor VEND-20{item}</p>
                    <p className="text-xs text-slate-400">Sent 24h ago · Confidence 89%</p>
                  </div>
                  <Link to="/workspace" className="inline-flex items-center gap-2 text-sm text-primary">
                    Download <Download className="h-4 w-4" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Compliance attestations" description="Quick actions" />
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-slate-600 dark:border-slate-700 dark:text-slate-200">
                <ShieldCheck className="h-4 w-4 text-emerald-500" aria-hidden /> SOC evidence vault ready
              </li>
              <li className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-slate-600 dark:border-slate-700 dark:text-slate-200">
                <ShieldCheck className="h-4 w-4 text-emerald-500" aria-hidden /> External notes synced
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
