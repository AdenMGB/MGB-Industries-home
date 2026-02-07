/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'peach': '#FFB5A7',
        'coral': '#FF8C94',
        'lavender': '#C8A8E9',
        'mint': '#A8E6CF',
        'soft-yellow': '#FFD3A5',
        'warm-pink': '#FFB6C1',
        'cream': '#FFF8E7',
        'soft-blue': '#B5E5E8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      letterSpacing: {
        tight: '-0.02em',
        tighter: '-0.04em',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'bounce-slow': 'bounce-slow 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shake': 'shake 0.5s ease-in-out',
        'slide-away': 'slide-away 0.5s ease-out forwards',
        'bounce-in': 'bounce-in 0.6s ease-out',
        'fade-in-scale': 'fade-in-scale 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-in-up': 'slide-in-up 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
          '0%': { 
            opacity: '0',
            transform: 'scale(0.95)',
          },
          '100%': { 
            opacity: '1',
            transform: 'scale(1)',
          },
        },
        'slide-in-up': {
          '0%': { 
            opacity: '0',
            transform: 'translateY(30px)',
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'scale-in': {
          '0%': { 
            opacity: '0',
            transform: 'scale(0.9)',
          },
          '100%': { 
            opacity: '1',
            transform: 'scale(1)',
          },
        },
      },
      transitionTimingFunction: {
        'premium': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        'premium': '300ms',
      },
    },
  },
  plugins: [],
}
