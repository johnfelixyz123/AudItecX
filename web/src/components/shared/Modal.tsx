import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from './Button'

type ModalProps = {
	open: boolean
	title: string
	onClose: () => void
	children: React.ReactNode
}

export function Modal({ open, title, onClose, children }: ModalProps) {
	return (
		<AnimatePresence>
			{open ? (
				<motion.div
					aria-modal="true"
					role="dialog"
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
				>
					<motion.div
						className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"
						initial={{ y: 24, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: 24, opacity: 0 }}
						transition={{ type: 'spring', stiffness: 320, damping: 26 }}
					>
						<header className="mb-4 flex items-start justify-between gap-4">
							<div>
								<h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
							</div>
							<Button
								type="button"
								variant="ghost"
								aria-label="Close dialog"
								onClick={onClose}
								icon={<X className="h-4 w-4" />}
							/>
						</header>
						<div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">{children}</div>
					</motion.div>
				</motion.div>
			) : null}
		</AnimatePresence>
	)
}
