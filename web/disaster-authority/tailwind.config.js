/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F7F9FC',
        surface: '#FFFFFF',
        sidebar: '#1A2233',
        text: '#1A2233',
        muted: '#6B7280',
        primary: '#0F6E5C',
        primaryDark: '#0B4F42',
        primaryLight: '#E6F4F1',
        danger: '#E14434',
        dangerDark: '#B82E20',
        dangerLight: '#FDF2F0',
        warning: '#F5A623',
        warningLight: '#FEF8EC',
        success: '#2E9E5B',
        successLight: '#EDF9F2',
        border: '#E4E8EF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)',
      },
      animation: {
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
