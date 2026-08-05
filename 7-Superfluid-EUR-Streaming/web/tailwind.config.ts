import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {
    fontFamily: { sans: ["var(--font-body)","system-ui","sans-serif"], mono: ["var(--font-mono)","monospace"] },
    colors: { fluid: { DEFAULT: "#16d1a8", 600: "#0fae8b" }, deep: { DEFAULT: "#0a1622", 800: "#0f2130", 700: "#183246" }, aqua: "#3fd0ff" },
  }},
  plugins: [],
};
export default config;
