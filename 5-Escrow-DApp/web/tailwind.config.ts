import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        void: { DEFAULT: "#0a0b0e", 800: "#111318", 700: "#181b22", 600: "#232833" },
        // Duotone: token A (offer) = cyan, token B (request) = amber.
        offer: "#22d3ee",
        request: "#fbbf24",
        signal: "#a3e635", // lime — actions / active
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34,211,238,0.25), 0 8px 30px -12px rgba(34,211,238,0.4)",
      },
    },
  },
  plugins: [],
};

export default config;
