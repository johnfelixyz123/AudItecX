import { useMemo, useState } from 'react'
import type { ComponentType, SVGProps } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Workflow,
  ShieldAlert,
  FileText,
  History,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../constants/routes'
import { cn } from '../../utils/cn'
import { BrandMark } from '../shared/BrandMark'

type NavItem = {
  label: string
  to: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  roles: string[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Internal Dashboard', to: ROUTES.dashboardInternal, icon: LayoutDashboard, roles: ['internal', 'admin'] },
  { label: 'External Dashboard', to: ROUTES.dashboardExternal, icon: Workflow, roles: ['external', 'admin'] },
  { label: 'Compliance', to: ROUTES.dashboardCompliance, icon: ShieldAlert, roles: ['compliance', 'admin'] },
  { label: 'Audit Workspace', to: ROUTES.workspace, icon: FileText, roles: ['internal', 'external', 'admin', 'compliance'] },
  { label: 'Run History', to: ROUTES.runHistory, icon: History, roles: ['internal', 'external', 'admin', 'compliance'] },
  { label: 'Admin', to: ROUTES.admin, icon: Users, roles: ['admin'] },
]

type SidebarNavProps = {
  variant?: 'desktop' | 'mobile'
  onNavigate?: () => void
  onClose?: () => void
}

export function SidebarNav({ variant = 'desktop', onNavigate, onClose }: SidebarNavProps) {
  const { user } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const isDesktop = variant === 'desktop'

  const filteredItems = useMemo(() => {
    if (!user) return []
    return NAV_ITEMS.filter((item) => item.roles.includes(user.role))
  }, [user])

  if (!user) {
    return null
  }

  return (
    <aside
      className={cn(
        'flex min-h-full flex-col gap-6 overflow-hidden border-r border-slate-200/70 bg-white/80 px-5 py-6 backdrop-blur-xl transition-all duration-300 dark:border-slate-800/70 dark:bg-slate-900/70',
        isDesktop ? 'sticky top-0 hidden w-72 rounded-r-[2.25rem] lg:flex' : 'w-full shadow-2xl',
        collapsed && isDesktop && 'w-20 px-3',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className={cn(
            'flex items-center',
            collapsed && isDesktop ? 'justify-center' : 'justify-start',
          )}
        >
          <BrandMark compact={collapsed && isDesktop} className={collapsed && isDesktop ? 'h-8' : 'h-9'} />
        </div>
        <div className="flex items-center gap-2">
          {isDesktop ? (
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden /> : <ChevronLeft className="h-4 w-4" aria-hidden />}
            </button>
          ) : null}
          {!isDesktop ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {filteredItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }: { isActive: boolean }) =>
                cn(
                  'flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                  isActive
                    ? 'bg-primary/15 text-primary shadow-sm'
                    : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800/75 dark:hover:text-slate-200',
                  collapsed && isDesktop && 'justify-center px-0',
                )
              }
              onClick={onNavigate}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {!collapsed || !isDesktop ? <span>{item.label}</span> : null}
            </NavLink>
          )
        })}
      </nav>
      <footer
        className={cn(
          'mt-auto rounded-2xl border border-dashed border-slate-200/70 bg-white/60 p-4 text-xs text-slate-500 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/60 dark:text-slate-400',
          collapsed && isDesktop && 'hidden',
        )}
      >
        Logged in as <strong className="font-semibold text-slate-700 dark:text-slate-100">{user.name}</strong>
        <div className="capitalize text-slate-400">{user.role} role</div>
      </footer>
    </aside>
  )
}
