import type { Config } from 'tailwindcss'

const config: Config = {
	darkMode: ['class', '[data-theme="dark"]'],
	content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
			},
			colors: {
				primary: {
					DEFAULT: '#2563eb',
					foreground: '#f8fafc',
					soft: '#dbeafe',
				},
				accent: {
					DEFAULT: '#38bdf8',
					foreground: '#0c4a6e',
				},
				muted: {
					DEFAULT: '#f1f5f9',
					foreground: '#475569',
				},
				ink: {
					DEFAULT: '#0f172a',
					light: '#1e293b',
				},
			},
			boxShadow: {
				card: '0 20px 45px -25px rgba(15, 23, 42, 0.55)',
				glass: '0 18px 60px -30px rgba(15, 23, 42, 0.45)',
			},
			backgroundImage: {
				page: 'linear-gradient(145deg, rgba(15, 23, 42, 0.04), rgba(14, 116, 144, 0.08))',
				'dark-page': 'radial-gradient(circle at 20% 20%, rgba(148, 163, 184, 0.05), transparent 60%), radial-gradient(circle at 80% 0%, rgba(59, 130, 246, 0.12), transparent 55%)',
			},
			keyframes: {
				pulseGlow: {
					'0%, 100%': { boxShadow: '0 0 0 0 rgba(37, 99, 235, 0.5)' },
					'50%': { boxShadow: '0 0 0 16px rgba(37, 99, 235, 0)' },
				},
			},
			animation: {
				pulseGlow: 'pulseGlow 4s ease-in-out infinite',
			},
		},
	},
	plugins: [],
}

export default config
