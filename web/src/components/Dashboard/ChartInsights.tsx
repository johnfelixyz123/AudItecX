import {
	ResponsiveContainer,
	LineChart,
	Line,
	CartesianGrid,
	XAxis,
	Tooltip,
	AreaChart,
	Area,
} from 'recharts'

const trendData = [
	{ period: 'Jan', volume: 12, anomalies: 2 },
	{ period: 'Feb', volume: 18, anomalies: 1 },
	{ period: 'Mar', volume: 22, anomalies: 3 },
	{ period: 'Apr', volume: 19, anomalies: 2 },
	{ period: 'May', volume: 27, anomalies: 4 },
	{ period: 'Jun', volume: 31, anomalies: 2 },
]

const confidenceData = [
	{ bucket: 'Matches', value: 82 },
	{ bucket: 'Anomalies', value: 11 },
	{ bucket: 'Pending', value: 7 },
]

export function ChartInsights() {
	return (
		<div className="grid gap-6 lg:grid-cols-2">
			<div className="card">
				<h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Audit volume trend</h3>
				<p className="text-xs text-slate-500 dark:text-slate-400">Runs executed per month vs anomalies detected.</p>
				<div className="mt-5 h-64">
					<ResponsiveContainer>
						<LineChart data={trendData}>
							<CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.4)" />
							<XAxis dataKey="period" stroke="var(--foreground)" fontSize={12} tickLine={false} axisLine={false} />
							<Tooltip cursor={{ stroke: '#1d4ed8', strokeWidth: 0.5 }} />
							<Line type="natural" dataKey="volume" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
							<Line type="natural" dataKey="anomalies" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
						</LineChart>
					</ResponsiveContainer>
				</div>
			</div>
			<div className="card">
				<h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Confidence distribution</h3>
				<p className="text-xs text-slate-500 dark:text-slate-400">Breakdown of reconciliation confidence levels.</p>
				<div className="mt-5 h-64">
					<ResponsiveContainer>
						<AreaChart data={confidenceData}>
							<CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.4)" />
							<XAxis dataKey="bucket" stroke="var(--foreground)" fontSize={12} tickLine={false} axisLine={false} />
							<Tooltip />
							<Area type="monotone" dataKey="value" stroke="#22c55e" fill="rgba(34,197,94,0.35)" strokeWidth={3} />
						</AreaChart>
					</ResponsiveContainer>
				</div>
			</div>
		</div>
	)
}
