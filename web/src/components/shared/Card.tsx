import type { ReactNode } from 'react'

import { cn } from '../../utils/cn'

export function Card({ className, children }: { className?: string; children: ReactNode }) {
	return <section className={cn('card', className)}>{children}</section>
}

export function CardHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
	return (
		<header className="mb-4 flex flex-col gap-2">
			<div className="flex items-start justify-between gap-3">
				<div className="flex flex-col">
					<h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
					{description ? <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
				</div>
				{action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
			</div>
		</header>
	)
}

export function CardContent({ children }: { children: ReactNode }) {
	return <div className="text-sm text-slate-600 dark:text-slate-300">{children}</div>
}

export function CardFooter({ children }: { children: ReactNode }) {
	return <div className="mt-4 border-t border-slate-200 pt-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">{children}</div>
}
