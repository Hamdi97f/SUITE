/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcdaff',
          300: '#8dc1ff',
          400: '#579dff',
          500: '#2f7bff',
          600: '#1a5ef0',
          700: '#1748c4',
          800: '#163c9b',
          900: '#16367a',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Noto Sans Arabic',
          'Noto Sans SC',
          'Noto Sans Devanagari',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
