/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00D4FF", // Cyan
        "primary-hover": "#00B8E6",
        secondary: "#9B59B6", // Purple
        "secondary-hover": "#8E44AD",
        accent: "#2D2D2D", // Charcoal
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      spacing: {
        section: "2rem",
      },
      borderRadius: {
        container: "0.75rem",
      },
    },
  },
  plugins: [],
}
