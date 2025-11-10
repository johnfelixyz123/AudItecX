import { forwardRef } from 'react'
import { cn } from '../../utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant
	icon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant = 'primary', icon, children, ...props }, ref) => {
		const base = 'btn'
		const variants: Record<ButtonVariant, string> = {
			primary: 'btn-primary',
			secondary: 'btn-muted',
			ghost: 'btn-ghost',
		}

		return (
			<button ref={ref} className={cn(base, variants[variant], className)} {...props}>
				{icon}
				{children}
			</button>
		)
	},
)

Button.displayName = 'Button'
