/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Almarai', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Almarai', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Space Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        main: '#fd4e38',
        secondary: '#1d242e',
      },
      keyframes: {
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.82)' },
          '70%': { opacity: '1', transform: 'scale(1.06)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'rise-in': 'rise-in 500ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'rise-in-delay': 'rise-in 500ms 120ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 300ms ease-out both',
        'pop-in': 'pop-in 560ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
        '2xl': '6rem',
      },
    },
  },
  plugins: [
    ({ addBase }) => {
      addBase({
        '@font-face': [
          {
            fontFamily: 'Almarai',
            fontStyle: 'normal',
            fontWeight: '400',
            fontDisplay: 'swap',
            src: "url('./fonts/ArbFONTS-Almarai-Regular.ttf') format('truetype')",
          },
          {
            fontFamily: 'Almarai',
            fontStyle: 'normal',
            fontWeight: '700',
            fontDisplay: 'swap',
            src: "url('./fonts/ArbFONTS-Almarai-Bold.ttf') format('truetype')",
          },
          {
            fontFamily: 'Space Mono',
            fontStyle: 'normal',
            fontWeight: '400',
            fontDisplay: 'swap',
            src: "url('./fonts/SpaceMono-Regular.ttf') format('truetype')",
          },
        ],
      });
    },
  ],
}
