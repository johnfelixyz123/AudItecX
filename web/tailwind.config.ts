import type { Config } from 'tailwindcss'

const config = {
	darkMode: ['class', '[data-theme="dark"]'],
	content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
			},
			colors: {
				background: {
					DEFAULT: 'hsl(var(--color-background) / <alpha-value>)',
				},
				foreground: {
					DEFAULT: 'hsl(var(--color-foreground) / <alpha-value>)',
				},
				surface: {
					DEFAULT: 'hsl(var(--color-surface) / <alpha-value>)',
					muted: 'hsl(var(--color-surface-muted) / <alpha-value>)',
				},
				border: {
					DEFAULT: 'hsl(var(--color-border) / <alpha-value>)',
				},
				primary: {
					DEFAULT: 'hsl(var(--color-primary) / <alpha-value>)',
					foreground: 'hsl(var(--color-primary-foreground) / <alpha-value>)',
					soft: 'hsl(var(--color-primary-soft) / <alpha-value>)',
				},
				accent: {
					DEFAULT: 'hsl(var(--color-accent) / <alpha-value>)',
					foreground: 'hsl(var(--color-accent-foreground) / <alpha-value>)',
				},
				muted: {
					DEFAULT: 'hsl(var(--color-muted) / <alpha-value>)',
					foreground: 'hsl(var(--color-muted-foreground) / <alpha-value>)',
				},
				ring: {
					DEFAULT: 'hsl(var(--color-ring) / <alpha-value>)',
				},
			},
			boxShadow: {
				card: '0 20px 45px -25px hsl(var(--shadow-elevated) / 0.45)',
				glass: '0 18px 60px -30px hsl(var(--shadow-elevated) / 0.35)',
			},
			backgroundImage: {
				page: 'linear-gradient(145deg, hsla(var(--shadow-elevated) / 0.08), hsla(var(--color-accent) / 0.12))',
				'dark-page': 'radial-gradient(circle at 20% 20%, hsla(var(--color-accent) / 0.1), transparent 60%), radial-gradient(circle at 80% 0%, hsla(var(--color-primary) / 0.18), transparent 55%)',
			},
			keyframes: {
				pulseGlow: {
					'0%, 100%': { boxShadow: '0 0 0 0 hsla(var(--color-primary) / 0.5)' },
					'50%': { boxShadow: '0 0 0 16px hsla(var(--color-primary) / 0)' },
				},
			},
			animation: {
				pulseGlow: 'pulseGlow 4s ease-in-out infinite',
			},
		},
	},
	plugins: [],
} satisfies Config

export default config
