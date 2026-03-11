/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: {
          50:  '#f0f7ee',
          100: '#dcefd8',
          200: '#b9deb1',
          300: '#88c57d',
          400: '#5aaa4d',
          500: '#3a8e2e',
          600: '#2d7022',
          700: '#265a1d',
          800: '#22471b',
          900: '#1c3b17',
          950: '#0d1f0c',
        },
        bark: {
          50:  '#f8f5f0',
          100: '#ede5d8',
          200: '#daccb5',
          300: '#c5ae8a',
          400: '#b08f66',
          500: '#9a7550',
          600: '#836145',
          700: '#6b4e3a',
          800: '#584133',
          900: '#49382e',
          950: '#271d17',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        'card-dark': '0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
      }
    }
  },
  plugins: []
}
