/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        yes: {
          light: "#dcfce7",
          DEFAULT: "#22c55e",
          dark: "#16a34a",
        },
        no: {
          light: "#fee2e2",
          DEFAULT: "#ef4444",
          dark: "#dc2626",
        },
        tg: {
          bg: "#0f1724",
          text: "#e8eaed",
          hint: "#8b95a5",
          link: "#2563eb",
          button: "#3b82f6",
          "button-text": "#ffffff",
          secondary: "#1a2035",
        },
      },
    },
  },
  plugins: [],
};
