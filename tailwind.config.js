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
          DEFAULT: '#FF2E63',
          dark: '#e0264f',
        },
        surface: {
          0: '#0c1421',   // body bg — dark navy (lifted from near-black)
          1: '#141e30',   // sidebar, panels
          2: '#1a2740',   // cards, calendar cells
          3: '#243352',   // elevated (day headers, button bg)
          4: '#2e4065',   // hover / active states
          5: '#3b4f78',   // borders, dividers
        },
        txt: {
          DEFAULT: '#e2e8f0',  // primary text — warm slate-white
          muted: '#8899b0',    // secondary text — steel blue
          faint: '#506580',    // tertiary / placeholder
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
