import { cn } from '../../utils/cn'

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
	return <section className={cn('card', className)}>{children}</section>
}

export function CardHeader({ title, description }: { title: string; description?: string }) {
	return (
		<header className="mb-4 flex flex-col gap-1">
			<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
			{description ? <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
		</header>
	)
}

export function CardContent({ children }: { children: React.ReactNode }) {
	return <div className="text-sm text-slate-600 dark:text-slate-300">{children}</div>
}
