/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        secondary: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
        },
        board: {
          light: '#f3e8d0',
          medium: '#d4a574',
          dark: '#8b5a3c',
        }
      },
      keyframes: {
        'stone-place': {
          '0%': { 
            transform: 'scale(0) rotate(0deg)',
            opacity: '0'
          },
          '50%': { 
            transform: 'scale(1.2) rotate(180deg)',
            opacity: '0.8'
          },
          '100%': { 
            transform: 'scale(1) rotate(360deg)',
            opacity: '1'
          }
        },
        'stone-hover': {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.1)' }
        },
        'board-glow': {
          '0%, 100%': { boxShadow: '0 0 0 rgba(59, 130, 246, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)' }
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' }
        },
        'slide-in-right': {
          '0%': { 
            transform: 'translateX(100%)',
            opacity: '0'
          },
          '100%': { 
            transform: 'translateX(0)',
            opacity: '1'
          }
        },
        'slide-in-left': {
          '0%': { 
            transform: 'translateX(-100%)',
            opacity: '0'
          },
          '100%': { 
            transform: 'translateX(0)',
            opacity: '1'
          }
        },
        'fade-in-up': {
          '0%': {
            transform: 'translateY(20px)',
            opacity: '0'
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1'
          }
        },
        'winning-line': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' }
        },
        'thinking': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(5deg)' },
          '75%': { transform: 'rotate(-5deg)' }
        },
        'undo': {
          '0%': { 
            transform: 'scale(1) rotate(0deg)',
            opacity: '1'
          },
          '50%': { 
            transform: 'scale(1.2) rotate(-180deg)',
            opacity: '0.5'
          },
          '100%': { 
            transform: 'scale(0) rotate(-360deg)',
            opacity: '0'
          }
        }
      },
      animation: {
        'stone-place': 'stone-place 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'stone-hover': 'stone-hover 0.2s ease-in-out',
        'board-glow': 'board-glow 2s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.5s ease-out',
        'slide-in-left': 'slide-in-left 0.5s ease-out',
        'fade-in-up': 'fade-in-up 0.6s ease-out',
        'winning-line': 'winning-line 0.8s ease-out',
        'thinking': 'thinking 1s ease-in-out infinite',
        'undo': 'undo 0.4s cubic-bezier(0.55, 0.085, 0.68, 0.53)',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
      },
      fontFamily: {
        'game': ['Inter', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'stone': '0 4px 20px rgba(0, 0, 0, 0.15)',
        'stone-white': '0 4px 20px rgba(0, 0, 0, 0.1)',
        'board': '0 20px 40px rgba(0, 0, 0, 0.1)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.5)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} 