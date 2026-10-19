import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        page: 'var(--page)',
        background: 'var(--color-bg)',
        sidebar: 'var(--sidebar-bg)',
        surface: 'var(--color-surface)',
        sunken: 'var(--surface-sunken)',
        foreground: 'var(--color-text)',
        muted: 'var(--text-muted)',
        dim: 'var(--text-dim)',
        faint: 'var(--text-faint)',
        ghost: 'var(--text-ghost)',
        frame: 'var(--border-frame)',
        card: 'var(--border-card)',
        soft: 'var(--border-soft)',
        row: 'var(--border-row)',
        strong: 'var(--border-strong)',
        action: 'var(--accent-500)',
        accent: {
          100: 'var(--accent-100)',
          200: 'var(--accent-200)',
          300: 'var(--accent-300)',
          400: 'var(--accent-400)',
          500: 'var(--accent-500)',
          600: 'var(--accent-600)',
          700: 'var(--accent-700)',
          800: 'var(--accent-800)',
          900: 'var(--accent-900)',
        },
        available: {
          DEFAULT: 'var(--status-available-text)',
          background: 'var(--status-available-bg)',
          border: 'var(--status-available-border)',
        },
        borrowed: {
          DEFAULT: 'var(--status-borrowed-text)',
          background: 'var(--status-borrowed-bg)',
          border: 'var(--status-borrowed-border)',
        },
        maintenance: {
          DEFAULT: 'var(--status-maintenance-text)',
          background: 'var(--status-maintenance-bg)',
          border: 'var(--status-maintenance-border)',
        },
        overdue: {
          DEFAULT: 'var(--status-overdue-text)',
          label: 'var(--status-overdue-label)',
          background: 'var(--status-overdue-bg)',
          border: 'var(--status-overdue-border)',
        },
      },
      fontFamily: {
        sans: ['var(--font-open-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
