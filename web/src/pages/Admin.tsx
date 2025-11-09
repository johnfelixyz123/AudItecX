import { Card, CardContent, CardHeader } from '../components/shared/Card'

const mockUsers = [
  { name: 'Ivy Internal', email: 'internal.auditor@example.com', role: 'internal' },
  { name: 'Eli External', email: 'external.auditor@example.com', role: 'external' },
  { name: 'Casey Compliance', email: 'compliance.officer@example.com', role: 'compliance' },
  { name: 'Ada Admin', email: 'admin@example.com', role: 'admin' },
]

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-wide text-slate-400">Administration</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">User access management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Manage mock users and roles for demo purposes.</p>
      </header>
      <Card>
        <CardHeader title="Team members" description="Mock directory sourced from local configuration." />
        <CardContent>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-2">Name</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {mockUsers.map((user) => (
                <tr key={user.email} className="text-slate-600 dark:text-slate-200">
                  <td className="py-2 font-medium">{user.name}</td>
                  <td className="py-2">{user.email}</td>
                  <td className="py-2 capitalize">{user.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
