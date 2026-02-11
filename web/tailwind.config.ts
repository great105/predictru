import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#060a14",
          900: "#0a0e1a",
          800: "#111827",
          700: "#151c2e",
          600: "#1a2236",
          500: "#212b44",
          400: "#2a3654",
          300: "#364264",
        },
        brand: {
          DEFAULT: "#06d6a0",
          light: "#34edc1",
          dim: "#06d6a020",
          glow: "#06d6a040",
        },
        amber: {
          DEFAULT: "#f5a623",
          light: "#fbbf24",
        },
        yes: {
          DEFAULT: "#10b981",
          light: "#34d399",
          dim: "#10b98118",
        },
        no: {
          DEFAULT: "#f43f5e",
          light: "#fb7185",
          dim: "#f43f5e18",
        },
        txt: {
          DEFAULT: "#e8eaed",
          secondary: "#9ca3b4",
          muted: "#6b7994",
          faint: "#3d4a65",
        },
        line: {
          DEFAULT: "#1e293b",
          light: "#2a3654",
        },
      },
      fontFamily: {
        display: ["Outfit", "system-ui", "sans-serif"],
        body: ["Manrope", "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', '"Fira Code"', "monospace"],
      },
      maxWidth: {
        site: "1440px",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "glow-brand": "radial-gradient(circle, #06d6a015 0%, transparent 70%)",
        "glow-yes": "radial-gradient(circle, #10b98115 0%, transparent 70%)",
        "glow-no": "radial-gradient(circle, #f43f5e15 0%, transparent 70%)",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        shimmer: "shimmer 2s infinite linear",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
