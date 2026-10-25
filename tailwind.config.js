/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,ts,svelte}'],
  // `hover:` only applies on devices that can hover, so taps never leave a stuck hover state.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        accent: 'hsl(var(--accent) / <alpha-value>)',
        success: 'hsl(var(--success) / <alpha-value>)',
        danger: 'hsl(var(--danger) / <alpha-value>)',
        bg: 'hsl(var(--bg) / <alpha-value>)',
        surface: 'hsl(var(--surface) / <alpha-value>)',
        content: 'hsl(var(--text) / <alpha-value>)',
        muted: 'hsl(var(--text-muted) / <alpha-value>)',
        fill: 'hsl(var(--fill))',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"SF Pro Display"',
          'system-ui',
          '"Segoe UI"',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      transitionTimingFunction: {
        apple: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      boxShadow: {
        poster: '0 6px 20px -6px rgba(0,0,0,0.35)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s cubic-bezier(0.16,1,0.3,1) both',
        'fade-up': 'fade-up 0.45s cubic-bezier(0.16,1,0.3,1) both',
      },
    },
  },
  plugins: [],
};
