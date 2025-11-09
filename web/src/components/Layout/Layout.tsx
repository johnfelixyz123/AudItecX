import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Outlet } from 'react-router-dom'
import { LLMChatWidget } from '../Chat/LLMChatWidget'
import { SidebarNav } from './SidebarNav'
import { Topbar } from './Topbar'

export function Layout() {
	const [mobileNavOpen, setMobileNavOpen] = useState(false)

	return (
		<div className="relative flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 text-slate-900 transition-colors before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_55%)] before:opacity-70 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
			<SidebarNav variant="desktop" />
			<div className="relative z-[1] flex w-full flex-col backdrop-blur-[1px]">
				<Topbar onToggleNav={() => setMobileNavOpen(true)} />
				<main className="relative flex-1 overflow-y-auto px-4 pb-8 pt-4 sm:px-6 lg:px-8">
					<motion.div
						className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-16"
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.35, ease: 'easeOut' }}
					>
						<Outlet />
					</motion.div>
				</main>
			</div>
			<LLMChatWidget />
			<AnimatePresence>
				{mobileNavOpen ? (
					<motion.div
						className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur md:hidden"
						onClick={() => setMobileNavOpen(false)}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<motion.div
							className="absolute inset-y-0 left-0 w-80 max-w-[85%] overflow-y-auto bg-white/95 p-4 shadow-2xl dark:bg-slate-900/95"
							onClick={(event) => event.stopPropagation()}
							initial={{ x: '-100%' }}
							animate={{ x: 0 }}
							exit={{ x: '-100%' }}
							transition={{ type: 'spring', stiffness: 260, damping: 30 }}
						>
							<SidebarNav variant="mobile" onNavigate={() => setMobileNavOpen(false)} onClose={() => setMobileNavOpen(false)} />
						</motion.div>
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	)
}
