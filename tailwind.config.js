/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mint: { 50: 'rgb(var(--mint-50) / <alpha-value>)', 100: 'rgb(var(--mint-100) / <alpha-value>)', 200: 'rgb(var(--mint-200) / <alpha-value>)', 300: 'rgb(var(--mint-300) / <alpha-value>)', 400: 'rgb(var(--mint-400) / <alpha-value>)', 500: 'rgb(var(--mint-500) / <alpha-value>)', 600: 'rgb(var(--mint-600) / <alpha-value>)', 700: 'rgb(var(--mint-700) / <alpha-value>)', 800: 'rgb(var(--mint-800) / <alpha-value>)', 900: 'rgb(var(--mint-900) / <alpha-value>)' },
        lime: { 300: '#D4EE7A', 400: '#BFE34A', 500: '#A3CC2A', 600: '#7FA21C' },
        lemon: { 300: '#FBEF8A', 400: '#F7E256', 500: '#EFD12B' },
        lagoon: { 300: '#7FE3DA', 400: '#3CCFC1', 500: '#1FB3A6', 600: '#178F86' },
        cream: { 50: 'rgb(var(--cream-50) / <alpha-value>)', 100: 'rgb(var(--cream-100) / <alpha-value>)', 200: 'rgb(var(--cream-200) / <alpha-value>)' },
        ink: { 700: 'rgb(var(--ink-700) / <alpha-value>)', 800: 'rgb(var(--ink-800) / <alpha-value>)', 900: 'rgb(var(--ink-900) / <alpha-value>)' },
        night: 'rgb(var(--night) / <alpha-value>)',
        rate: { bad: '#E5484D', mid: '#F2994A', good: '#3DBE6A', top: '#0F7A43' },
      },
      fontFamily: {
        brand: ['Audiowide', 'Manrope', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,42,32,.06), 0 8px 24px -12px rgba(11,42,32,.18)',
        lift: '0 2px 4px rgba(11,42,32,.08), 0 18px 40px -16px rgba(11,42,32,.30)',
      },
      borderRadius: { xl2: '1.25rem' },
      keyframes: {
        pageIn: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        floaty: { '0%,100%': { transform: 'translateY(0) rotate(var(--r,0deg))' }, '50%': { transform: 'translateY(-6px) rotate(var(--r,0deg))' } },
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
      },
      animation: {
        pageIn: 'pageIn .35s ease-out both',
        floaty: 'floaty 6s ease-in-out infinite',
        shimmer: 'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [],
};
