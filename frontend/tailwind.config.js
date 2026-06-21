/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f172a',
        card: '#1e293b',
        cardLight: '#27374d',
        primary: '#f4af00',
        primaryDark: '#c98e00',
        level: {
          1: '#6b7280', // Empty Plot - Gray
          2: '#22c55e', // House - Green
          3: '#3b82f6', // Shop - Blue
          4: '#a855f7', // Business Center - Purple
          5: '#f4af00', // Mega Tower - Gold
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(244, 175, 0, 0.35)',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0px rgba(244,175,0,0.0)' },
          '50%': { boxShadow: '0 0 18px rgba(244,175,0,0.55)' },
        },
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        pulseGlow: 'pulseGlow 2.4s ease-in-out infinite',
        fadeUp: 'fadeUp 0.35s ease-out',
      },
    },
  },
  plugins: [],
};
