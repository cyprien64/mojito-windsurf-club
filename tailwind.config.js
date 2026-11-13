/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        mint: { 50: '#EEFBF4', 100: '#D5F5E4', 200: '#ACEBCB', 300: '#7BDCAE', 400: '#4CC98F', 500: '#2BB077', 600: '#1E8F60', 700: '#19724E', 800: '#175B40', 900: '#134B36' },
        lime: { 300: '#D4EE7A', 400: '#BFE34A', 500: '#A3CC2A', 600: '#7FA21C' },
        lemon: { 300: '#FBEF8A', 400: '#F7E256', 500: '#EFD12B' },
        lagoon: { 300: '#7FE3DA', 400: '#3CCFC1', 500: '#1FB3A6', 600: '#178F86' },
        cream: { 50: '#FFFDF7', 100: '#FAF7EC', 200: '#F2EDDB' },
        ink: { 700: '#1C4A3A', 800: '#123A2C', 900: '#0B2A20' },
        rate: { bad: '#E5484D', mid: '#F2994A', good: '#3DBE6A', top: '#0F7A43' },
      },
      fontFamily: {
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
