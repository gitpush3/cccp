const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  mode: "jit",
  darkMode: "class",
  purge: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter var", ...fontFamily.sans],
      },
      borderRadius: {
        DEFAULT: "1rem", // More rounded default
        lg: "1.5rem",
        xl: "2rem",
        "2xl": "3rem",
        full: "9999px", // Pill shape
        container: "2rem",
      },
      boxShadow: {
        DEFAULT: "0 1px 4px rgba(0, 0, 0, 0.1)",
        hover: "0 2px 8px rgba(0, 0, 0, 0.12)",
      },
      colors: {
        primary: {
          DEFAULT: "#002D4D", // Deep Blue
          hover: "#001f36",
        },
        secondary: {
          DEFAULT: "#757575", // Mid Gray
          hover: "#424242",
        },
        accent: {
          DEFAULT: "#B85042", // Terracotta
          hover: "#9a3f33",
        },
        dark: {
          DEFAULT: "#424242", // Dark Gray for dark mode background
          surface: "#303030", // Slightly darker/lighter for surfaces? Or keep same? User said "Dark Gray (for dark mode fill)"
        },
        gray: {
          light: "#E0E0E0",
          mid: "#757575",
          dark: "#424242",
        },
      },
      spacing: {
        "form-field": "16px",
        section: "32px",
      },
    },
  },
  variants: {
    extend: {
      boxShadow: ["hover", "active"],
    },
  },
};
