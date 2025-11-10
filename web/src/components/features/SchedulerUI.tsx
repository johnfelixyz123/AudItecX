import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '../shared/Card'
import { Button } from '../shared/Button'
import { fetchSchedules, createSchedule, deleteSchedule, type ScheduleItem, type CreateSchedulePayload } from '../../services/api'

const frequencyOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

type FormState = {
  vendorId: string
  frequency: 'daily' | 'weekly' | 'monthly'
  startDate: string
}

const INITIAL_FORM: FormState = {
  vendorId: '',
  frequency: 'daily',
  startDate: '',
}

function formatNextRun(nextRunAt?: string | null): string {
  if (!nextRunAt) {
    return 'Pending next cycle'
  }
  const target = new Date(nextRunAt)
  if (Number.isNaN(target.getTime())) {
    return 'Pending next cycle'
  }
  const absolute = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(target)
  const diffMs = target.getTime() - Date.now()
  const diffHours = Math.round(diffMs / (1000 * 60 * 60))
  if (Math.abs(diffHours) < 1) {
    return `${absolute} (within the hour)`
  }
  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) >= 1) {
    const label = diffDays > 0 ? 'days' : 'days ago'
    return `${absolute} (${Math.abs(diffDays)} ${label})`
  }
  const label = diffHours > 0 ? 'hours' : 'hours ago'
  return `${absolute} (${Math.abs(diffHours)} ${label})`
}

export function SchedulerUI() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasSchedules = useMemo(() => schedules.length > 0, [schedules])

  const loadSchedules = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSchedules()
      setSchedules(data)
    } catch (err) {
      console.error('Failed to load schedules', err)
      setError('Unable to load schedules. Please try again later.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSchedules()
  }, [loadSchedules])

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.vendorId.trim()) {
      setError('Vendor ID is required to schedule a run.')
      return
    }
    setSaving(true)
    setError(null)
    const payload: CreateSchedulePayload = {
      vendor_id: form.vendorId.trim(),
      frequency: form.frequency,
      start_date: form.startDate || undefined,
    }
    try {
      await createSchedule(payload)
      setForm(INITIAL_FORM)
      await loadSchedules()
    } catch (err) {
      console.error('Failed to create schedule', err)
      setError('Could not create the schedule. Please retry.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setError(null)
    try {
      await deleteSchedule(id)
      await loadSchedules()
    } catch (err) {
      console.error('Failed to delete schedule', err)
      setError('Could not remove the schedule. Please retry.')
    }
  }

  return (
    <Card>
      <CardHeader title="Audit scheduler" description="Configure recurring audits for high-risk vendors." />
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1 text-sm" htmlFor="scheduler-vendor">
              <span className="font-medium text-slate-600 dark:text-slate-200">Vendor ID</span>
              <input
                id="scheduler-vendor"
                name="vendorId"
                value={form.vendorId}
                onChange={handleChange}
                placeholder="VEND-100"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="space-y-1 text-sm" htmlFor="scheduler-frequency">
              <span className="font-medium text-slate-600 dark:text-slate-200">Frequency</span>
              <select
                id="scheduler-frequency"
                name="frequency"
                value={form.frequency}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-700 dark:bg-slate-900"
              >
                {frequencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm" htmlFor="scheduler-start">
              <span className="font-medium text-slate-600 dark:text-slate-200">Start date</span>
              <input
                id="scheduler-start"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                type="date"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" disabled={saving} className="inline-flex items-center">
            {saving ? 'Scheduling…' : 'Schedule audit'}
          </Button>
        </form>
      </CardContent>
      <CardFooter>
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading schedules…</p>
        ) : hasSchedules ? (
          <ul className="space-y-3 text-sm">
            {schedules.map((schedule) => (
              <li key={schedule.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-800">
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-200">
                    Vendor {schedule.vendor_id} · {schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Next run: {formatNextRun(schedule.next_run_at)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(schedule.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-transparent px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                  aria-label={`Delete schedule for ${schedule.vendor_id}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Delete
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No recurring audits configured yet.</p>
        )}
      </CardFooter>
    </Card>
  )
}
