import { cn } from '../../utils/cn'
import logoUrl from '../../assets/auditecx-logo.png'

type BrandMarkProps = {
  className?: string
  compact?: boolean
  ariaHidden?: boolean
  wrapperClassName?: string
}

export function BrandMark({ className, compact = false, ariaHidden = false, wrapperClassName }: BrandMarkProps) {
  return (
    <span
      className={cn(
        'inline-flex flex-col items-center text-blue-100 dark:text-slate-100',
        !compact && 'gap-4',
        compact && 'flex-row gap-3',
        wrapperClassName,
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
        <span className="font-semibold tracking-tight drop-shadow-lg text-6xl">
          <span className="font-bold text-sky-300">A</span>
          ud
          <span className="font-bold text-sky-300">I</span>
          tec
          <span className="font-bold text-sky-300">X</span>
        </span>
      ) : null}
    </span>
  )
}
