/** @type {import('tailwindcss').Config} */
import tailwindScrollbar from 'tailwind-scrollbar';

module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        azul: {
          principal: "#344BFF",
          Principal2: "#4C6EFF",
          Principal3: "#6E95FF",
          principal4: "#202F8F",
          principal5: "#1D2EB6",
          clarito: "#EBF4FF",
          200: "#BED8FF",
          100: "#DBEAFF",
          oscuro: "#131A53",
        },
        background: "#FFFFFF",
        foreground: "#000000",
        gray: {
          "676767": "#676767",
          "797979": "#797979",
          "CBD5E1": "#CBD5E1",
          "1B1B1B": "#1B1B1B",
          "647487": "#647487",
        },
      },
    },
  },
  plugins: [tailwindScrollbar],
}