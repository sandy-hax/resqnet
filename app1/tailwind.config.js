/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#F7F9FC',
          surface: '#FFFFFF',
          text: '#1A2233',
          muted: '#6B7280',
          primary: '#0F6E5C',
          'primary-dark': '#0B4F42',
          danger: '#E14434',
          warning: '#F5A623',
          success: '#2E9E5B',
          border: '#E4E8EF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-sos': 'pulseSos 2s infinite',
        'ripple': 'rippleEffect 1.8s ease-out infinite',
      },
      keyframes: {
        pulseSos: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(225, 68, 52, 0.7)' },
          '50%': { transform: 'scale(1.04)', boxShadow: '0 0 0 20px rgba(225, 68, 52, 0)' },
        },
        rippleEffect: {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        }
      }
    },
  },
  plugins: [],
}
