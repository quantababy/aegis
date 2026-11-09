/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        aegis: {
          dark: 'rgb(var(--color-bg-rgb) / <alpha-value>)',
          panel: 'rgb(var(--color-panel-rgb) / <alpha-value>)',
          surface: 'rgb(var(--color-surface-rgb) / <alpha-value>)',
          border: 'rgb(var(--color-border-rgb) / <alpha-value>)',
          accent: 'rgb(var(--color-accent-rgb) / <alpha-value>)',
          'accent-light': 'var(--color-accent-light)',
          red: '#ef4444',
          green: '#22c55e',
          yellow: '#eab308',
          purple: '#a855f7',
          cyan: '#06b6d4',
        },
      },
      boxShadow: {
        elevated: 'var(--shadow-elevated)',
        'neon-green': '0 0 15px rgba(34, 197, 94, 0.4)',
        'neon-cyan': '0 0 15px rgba(34, 197, 94, 0.4)',
      },
    },
  },
  plugins: [],
}
