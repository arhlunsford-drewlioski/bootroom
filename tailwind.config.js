/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          dark: 'rgb(var(--accent-dark) / <alpha-value>)',
        },
        surface: {
          0: 'rgb(var(--surface-0) / <alpha-value>)',
          1: 'rgb(var(--surface-1) / <alpha-value>)',
          2: 'rgb(var(--surface-2) / <alpha-value>)',
          3: 'rgb(var(--surface-3) / <alpha-value>)',
          4: 'rgb(var(--surface-4) / <alpha-value>)',
          5: 'rgb(var(--surface-5) / <alpha-value>)',
        },
        txt: {
          DEFAULT: 'rgb(var(--txt) / <alpha-value>)',
          muted: 'rgb(var(--txt-muted) / <alpha-value>)',
          faint: 'rgb(var(--txt-faint) / <alpha-value>)',
        },
        clr: {
          success: 'rgb(var(--clr-success) / <alpha-value>)',
          warning: 'rgb(var(--clr-warning) / <alpha-value>)',
          info: 'rgb(var(--clr-info) / <alpha-value>)',
          purple: 'rgb(var(--clr-purple) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Bebas Neue"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
