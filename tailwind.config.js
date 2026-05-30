/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{astro,html,js,ts,jsx,tsx,vue,svelte,md,mdx}'],
  theme: {
    extend: {
      colors: {
        accent: 'hsl(var(--accent) / <alpha-value>)',
        'accent-hover': 'hsl(var(--accent-hover) / <alpha-value>)',
        bg: 'hsl(var(--bg) / <alpha-value>)',
        surface: 'hsl(var(--surface) / <alpha-value>)',
        content: 'hsl(var(--text) / <alpha-value>)',
        muted: 'hsl(var(--text-muted) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Segoe UI"',
          'system-ui',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: { '4xl': '2rem' },
      backdropBlur: { xs: '2px' },
      transitionTimingFunction: {
        apple: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0,0,0,0.06)',
        glass: '0 8px 32px rgba(0,0,0,0.08)',
        sheet: '0 20px 60px rgba(0,0,0,0.15)',
        poster: '0 10px 34px rgba(0,0,0,0.18)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.32,0.72,0,1) both',
        'fade-in': 'fade-in 0.3s cubic-bezier(0.32,0.72,0,1) both',
        'slide-up': 'slide-up 0.42s cubic-bezier(0.32,0.72,0,1) both',
        'scale-in': 'scale-in 0.32s cubic-bezier(0.32,0.72,0,1) both',
        'slide-in-right': 'slide-in-right 0.38s cubic-bezier(0.32,0.72,0,1) both',
      },
    },
  },
  plugins: [],
};
