import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0A0806",
        surface: "#110E0A",
        card: "#18140F",
        line: "#2A2218",
        ink: "#F2E8D9",
        muted: "#8A7A6A",
        dim: "#4A3A2A",
        ember: "#E87B2E",
        emberdim: "rgba(232,123,46,0.12)",
        gain: "#5DBF7A",
        loss: "#E8532E",
      },
      fontFamily: {
        mono: ["'DM Mono'", "'Courier New'", "monospace"],
        sans: ["'Geist'", "system-ui", "sans-serif"],
      },
      borderRadius: { card: "12px", pill: "20px" },
    },
  },
  plugins: [],
};
export default config;
