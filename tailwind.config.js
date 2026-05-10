/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // New warm-rooted palette (primary direction)
        ochre: {
          DEFAULT: '#CC7B3C',
          50: '#FBF1E8',
          100: '#F5DEC3',
          200: '#EFC79A',
          300: '#E5A867',
          400: '#D88E47',
          500: '#CC7B3C',
          600: '#A6612E',
          700: '#7E4922',
          800: '#553118',
          900: '#2E1A0D',
        },
        terracotta: {
          DEFAULT: '#8C3A35',
          50: '#F6E2DF',
          100: '#EBC1BC',
          200: '#D89691',
          300: '#C46863',
          400: '#A84A45',
          500: '#8C3A35',
          600: '#6F2E2A',
          700: '#52221F',
          800: '#341614',
          900: '#1B0B0A',
        },
        eucalyptus: {
          DEFAULT: '#5C7A68',
          50: '#E8EFEB',
          100: '#CFDDD5',
          200: '#A3BDAD',
          300: '#789C85',
          400: '#5C7A68',
          500: '#475F51',
          600: '#33453A',
          700: '#212C24',
        },
        cream: {
          DEFAULT: '#FDFBF7',
          50: '#FFFFFF',
          100: '#FDFBF7',
          200: '#F8F1E2',
          300: '#F0E4C9',
        },
        charcoal: {
          DEFAULT: '#161412',
          50: '#9A938A',
          100: '#7B756C',
          200: '#5D584F',
          300: '#403C36',
          400: '#2A2723',
          500: '#161412',
          600: '#0B0B0F',
        },

        // Legacy pastel palette kept so existing dev-tool pages keep working.
        peach: '#E5A867',
        coral: '#A84A45',
        lavender: '#8C3A35',
        mint: '#5C7A68',
        'soft-yellow': '#EFC79A',
        'warm-pink': '#D89691',
        'soft-blue': '#789C85',
        gray: {
          950: '#0B0B0F',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      letterSpacing: {
        tight: '-0.02em',
        tighter: '-0.04em',
        wider: '0.04em',
        widest: '0.12em',
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundImage: {
        'paper-grain':
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.08 0 0 0 0 0.06 0 0 0 0 0.04 0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>\")",
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px -20px rgba(204,123,60,0.35)',
        'glow-sm': '0 0 0 1px rgba(255,255,255,0.05), 0 10px 30px -12px rgba(204,123,60,0.25)',
      },
      animation: {
        'bounce-slow': 'bounce-slow 3s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        wiggle: 'wiggle 1s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shake: 'shake 0.5s ease-in-out',
        'slide-away': 'slide-away 0.5s ease-out forwards',
        'bounce-in': 'bounce-in 0.6s ease-out',
        'fade-in-scale': 'fade-in-scale 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-in-up': 'slide-in-up 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        shimmer: 'shimmer 2.6s linear infinite',
      },
      keyframes: {
        'bounce-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-10px) rotate(2deg)' },
          '66%': { transform: 'translateY(-5px) rotate(-2deg)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-10px)' },
          '75%': { transform: 'translateX(10px)' },
        },
        'slide-away': {
          '0%': { transform: 'translateX(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateX(200px) scale(0.8)', opacity: '0' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'fade-in-scale': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-up': {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        premium: '300ms',
      },
    },
  },
  plugins: [],
}
