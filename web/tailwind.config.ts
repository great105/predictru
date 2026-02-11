import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          0: "#06080f",
          1: "#0c1020",
          2: "#131829",
          3: "#1a2035",
          4: "#212842",
        },
        accent: {
          DEFAULT: "#3b82f6",
          light: "#60a5fa",
          glow: "#3b82f680",
        },
        yes: {
          DEFAULT: "#10b981",
          light: "#34d399",
          dim: "#10b98130",
        },
        no: {
          DEFAULT: "#f43f5e",
          light: "#fb7185",
          dim: "#f43f5e30",
        },
        gold: "#f59e0b",
        silver: "#94a3b8",
        muted: "#64748b",
        border: "#1e293b",
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "glow-yes": "radial-gradient(circle, #10b98120 0%, transparent 70%)",
        "glow-no": "radial-gradient(circle, #f43f5e20 0%, transparent 70%)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "count-up": "countUp 0.8s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px 0 #3b82f620" },
          "50%": { boxShadow: "0 0 30px 5px #3b82f640" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
