import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./contexts/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        paper: "#F5EFE1",
        ink: "#16130E",
        violet: { DEFAULT: "#5B2FF5", ink: "#3d1fb0" },
        coral: "#FF5B39",
        grass: "#12B981",
      },
      boxShadow: {
        hard: "4px 4px 0 0 #16130E",
        "hard-sm": "2px 2px 0 0 #16130E",
        "hard-lg": "6px 6px 0 0 #16130E",
        "hard-violet": "4px 4px 0 0 #5B2FF5",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pop: {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        rise: "rise 0.5s cubic-bezier(0.22,1,0.36,1) both",
        pop: "pop 0.25s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
