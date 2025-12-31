/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./admin.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors
        brand: {
          cyan: "#43e1f5",
          "cyan-light": "#29c8ff",
          purple: "#bf69f1",
          violet: "#7a6df0",
          dark: "#333333",
          white: "#ffffff",
        },
        primary: "#43e1f5",
        "primary-hover": "#29c8ff",
        secondary: "#bf69f1",
        "secondary-hover": "#7a6df0",
        accent: "#333333",
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
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #43e1f5 0%, #bf69f1 100%)',
        'gradient-brand-hover': 'linear-gradient(135deg, #29c8ff 0%, #7a6df0 100%)',
        'gradient-dark': 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(67, 225, 245, 0.3)',
        'glow-purple': '0 0 20px rgba(191, 105, 241, 0.3)',
        'glow-brand': '0 0 30px rgba(67, 225, 245, 0.2), 0 0 60px rgba(191, 105, 241, 0.1)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(67, 225, 245, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(67, 225, 245, 0.5), 0 0 60px rgba(191, 105, 241, 0.3)' },
        },
      },
    },
  },
  plugins: [],
}
