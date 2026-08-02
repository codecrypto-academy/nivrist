import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./contexts/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        ink: {
          950: "#080b10",
          900: "#0b0f14",
          800: "#111820",
          700: "#1a232e",
          600: "#25313f",
        },
        mint: {
          DEFAULT: "#3ee6a5",
          400: "#5cf0b7",
          600: "#1fb981",
        },
        gold: "#e8b84b",
      },
    },
  },
  plugins: [],
};

export default config;
