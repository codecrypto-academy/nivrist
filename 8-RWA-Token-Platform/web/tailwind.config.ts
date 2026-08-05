import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0a0b0d",
          800: "#101216",
          700: "#161a20",
          600: "#1f242c",
          500: "#2a313b",
        },
        parchment: {
          DEFAULT: "#f4efe3",
          dim: "#c7c0b0",
          faint: "#8b8676",
        },
        gold: {
          DEFAULT: "#d8b45a",
          bright: "#f0cf7a",
          deep: "#a8863a",
        },
        sage: "#7fae8a",
        rust: "#c56a4a",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        vault: "0 2px 0 0 #000, 0 0 0 1px rgba(216,180,90,0.14)",
        lift: "0 24px 60px -20px rgba(0,0,0,0.7)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGold: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        rise: "rise 0.6s cubic-bezier(0.16,1,0.3,1) both",
        pulseGold: "pulseGold 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
