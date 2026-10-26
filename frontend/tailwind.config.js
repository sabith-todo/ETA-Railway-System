/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        railway: {
          darkest: "rgb(var(--railway-darkest) / <alpha-value>)",
          dark: "rgb(var(--railway-dark) / <alpha-value>)",
          surface: "rgb(var(--railway-surface) / <alpha-value>)",
          card: "rgb(var(--railway-card) / <alpha-value>)",
          border: "rgb(var(--railway-border) / <alpha-value>)",
          hover: "rgb(var(--railway-hover) / <alpha-value>)",
          accent: "rgb(var(--railway-accent) / <alpha-value>)",
          accentHover: "rgb(var(--railway-accent-hover) / <alpha-value>)",
          accentSoft: "rgb(var(--railway-accent) / 0.15)",
          gold: "rgb(var(--railway-gold) / <alpha-value>)",
          emerald: "#10B981",
          emeraldSoft: "rgba(16, 185, 129, 0.15)",
          ruby: "#EF4444",
          rubySoft: "rgba(239, 68, 68, 0.15)",
          amber: "#F59E0B",
          amberSoft: "rgba(245, 158, 11, 0.15)",
          textPrimary: "rgb(var(--railway-text-primary) / <alpha-value>)",
          textSecondary: "rgb(var(--railway-text-secondary) / <alpha-value>)",
          textMuted: "rgb(var(--railway-text-muted) / <alpha-value>)"
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite'
      }
    },
  },
  plugins: [],
}
