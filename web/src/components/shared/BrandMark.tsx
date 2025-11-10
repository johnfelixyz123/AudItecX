import { cn } from '../../utils/cn'
import logoUrl from '../../assets/auditecx-logo.png'

type BrandMarkProps = {
  className?: string
  compact?: boolean
  ariaHidden?: boolean
}

export function BrandMark({ className, compact = false, ariaHidden = false }: BrandMarkProps) {
  return (
    <span
      className={cn(
        'inline-flex flex-col items-center text-slate-800 dark:text-slate-100',
        !compact && 'gap-4',
        compact && 'flex-row gap-2',
      )}
      aria-hidden={ariaHidden}
    >
      <img
        src={logoUrl}
        alt="AudItecX logo"
        className={cn(
          'h-[6.75rem] w-auto drop-shadow-sm transition-transform duration-300 hover:scale-[1.05]',
          compact && 'h-[3.375rem]',
          className,
        )}
        loading="lazy"
      />
      {!compact ? (
        <span className="text-2xl font-semibold tracking-tight">
          <span className="font-bold text-emerald-600">A</span>
          ud
          <span className="font-bold text-emerald-600">I</span>
          tec
          <span className="font-bold text-emerald-600">X</span>
        </span>
      ) : null}
    </span>
  )
}
