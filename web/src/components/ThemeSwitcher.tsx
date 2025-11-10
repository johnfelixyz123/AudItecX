import type { LucideIcon } from 'lucide-react'
import { Check, Contrast, Monitor, MoonStar, Sun } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import { cn } from '../utils/cn'

const themeLabelMap: Record<'light' | 'dark' | 'contrast', string> = {
	light: 'Light',
	dark: 'Dark',
	contrast: 'High contrast',
}

const iconMap: Record<string, LucideIcon> = {
	system: Monitor,
	light: Sun,
	dark: MoonStar,
	contrast: Contrast,
}

export function ThemeSwitcher() {
	const { theme, preference, availableThemes, setPreference } = useTheme()
	const activeLabel = themeLabelMap[theme] ?? theme

	return (
		<section className="rounded-xl border border-border/40 bg-surface-muted/40 p-3">
			<div className="mb-2 flex items-center justify-between">
				<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Theme</span>
				<span className="text-xs text-muted-foreground">{activeLabel}</span>
			</div>
			<div role="radiogroup" aria-label="Theme selection" className="flex flex-col gap-2">
				{availableThemes.map((option) => {
					const Icon = iconMap[option.value] ?? Monitor
					const isSelected = preference === option.value
					return (
						<button
							key={option.value}
							type="button"
							role="radio"
							aria-checked={isSelected}
							onClick={() => setPreference(option.value)}
							className={cn(
								'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
								isSelected
									? 'border-primary/70 bg-primary/10 text-foreground shadow-card'
									: 'border-transparent bg-surface text-muted hover:border-primary/40 hover:bg-surface-muted/70',
							)}
						>
							<span className={cn('flex h-9 w-9 items-center justify-center rounded-full text-primary', isSelected ? 'bg-primary/20' : 'bg-primary/15')}>
								<Icon className="h-4 w-4" aria-hidden />
							</span>
							<span className="flex-1">
								<span className="block text-sm font-medium text-foreground">{option.label}</span>
								<span className="block text-xs text-muted-foreground">{option.description}</span>
							</span>
							{isSelected ? <Check className="h-4 w-4 text-primary" aria-hidden /> : null}
						</button>
					)
				})}
			</div>
		</section>
	)
}
