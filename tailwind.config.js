/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: { 900: '#070b14', 800: '#0b1220', 700: '#111a2e', 600: '#1a2540' },
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        pulseGlow: {
          '0%,100%': { opacity: '0.4' }, '50%': { opacity: '1' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
        pulseGlow: 'pulseGlow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
