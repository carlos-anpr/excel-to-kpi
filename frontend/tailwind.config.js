/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#007BFF",
        "green": "#0bda5b",
        "red": "#fa6238",
        "orange": "#ED8936",
        "teal": "#4FD1C5",
        "magenta": "#D53F8C",
        "lime": "#84CC16",
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"]
      },
    },
  },
  plugins: [
    require("tailwindcss-animate")
  ],
}
