import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#E4002B',
          gold: '#FFD700',
        },
      },
      fontFamily: {
        heading: ['var(--font-barlow)', 'sans-serif'],
        body:    ['var(--font-dmsans)', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pop': {
          '0%':   { transform: 'scale(1)' },
          '40%':  { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        'slide-right': {
          '0%':   { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'marquee': {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      animation: {
        'fade-up':     'fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in':     'fade-in 0.5s ease both',
        'scale-in':    'scale-in 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'pop':         'pop 0.3s ease',
        'slide-right': 'slide-right 0.7s cubic-bezier(0.22,1,0.36,1) both',
        'marquee':     'marquee 28s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
