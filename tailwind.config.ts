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
        background:       "oklch(0.08 0.005 260)",
        foreground:       "oklch(0.95 0 0)",
        card:             "oklch(0.11 0.005 260)",
        "card-foreground":"oklch(0.95 0 0)",
        sidebar:          "oklch(0.09 0.005 260)",
        "sidebar-border": "oklch(0.18 0.005 260)",
        "sidebar-foreground": "oklch(0.95 0 0)",
        "sidebar-accent": "oklch(0.14 0.005 260)",
        border:           "oklch(0.18 0.005 260)",
        input:            "oklch(0.18 0.005 260)",
        ring:             "oklch(0.7 0.18 220)",
        primary:          "oklch(0.7 0.18 220)",
        "primary-foreground": "oklch(0.08 0.005 260)",
        secondary:        "oklch(0.16 0.005 260)",
        "secondary-foreground": "oklch(0.95 0 0)",
        muted:            "oklch(0.16 0.005 260)",
        "muted-foreground":"oklch(0.65 0 0)",
        accent:           "oklch(0.7 0.18 220)",
        "accent-foreground": "oklch(0.08 0.005 260)",
        success:          "oklch(0.7 0.18 145)",
        "success-foreground": "oklch(0.08 0 0)",
        warning:          "oklch(0.8 0.15 80)",
        "warning-foreground": "oklch(0.08 0 0)",
        destructive:      "oklch(0.65 0.22 25)",
        "destructive-foreground": "oklch(0.95 0 0)",
        "chart-1":        "oklch(0.7 0.18 220)",
        "chart-2":        "oklch(0.7 0.18 145)",
        "chart-3":        "oklch(0.75 0.15 55)",
        "chart-4":        "oklch(0.7 0.18 300)",
        "chart-5":        "oklch(0.65 0.2 15)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.75rem",
        lg: "0.625rem",
        md: "0.5rem",
      },
      animation: {
        "in": "in 0.5s ease forwards",
      },
      keyframes: {
        in: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
