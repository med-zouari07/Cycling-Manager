/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* FTC Navy Blue — Fédération Tunisienne de Cyclisme */
        primary: {
          50:  '#eef2fb',
          100: '#d5e0f5',
          200: '#adc1ea',
          300: '#7c9bdc',
          400: '#4e72cc',
          500: '#2e52b2',
          600: '#1a3a8a',  /* logo dark blue */
          700: '#142e72',
          800: '#0f2259',
          900: '#0a163b',
          950: '#060e24',
        },
        /* FTC Red — Tunisian flag / star */
        ftcred: {
          50:  '#fff1f2',
          100: '#ffdde0',
          200: '#ffb3ba',
          300: '#ff7a86',
          400: '#ff3d4e',
          500: '#e30613',  /* logo red */
          600: '#c50210',
          700: '#a1010d',
          800: '#840310',
          900: '#6e0710',
        },
        accent: {
          50:  '#fff1f2',
          100: '#ffdde0',
          400: '#ff3d4e',
          500: '#e30613',
          600: '#c50210',
          700: '#a1010d',
        },
        success: {
          50: '#f0fdf4', 100: '#dcfce7', 400: '#4ade80',
          500: '#22c55e', 600: '#16a34a', 700: '#15803d',
        },
        warning: {
          50: '#fffbeb', 100: '#fef3c7', 400: '#facc15',
          500: '#eab308', 600: '#ca8a04', 700: '#a16207',
        },
        error: {
          50: '#fef2f2', 100: '#fee2e2', 400: '#f87171',
          500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 10px 30px -10px rgb(26 58 138 / 0.3)',
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%':   { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in':  'fade-in 0.4s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
