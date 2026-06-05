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
        background:       "oklch(var(--background) / <alpha-value>)",
        foreground:       "oklch(var(--foreground) / <alpha-value>)",
        card:             "oklch(var(--card) / <alpha-value>)",
        "card-foreground":"oklch(var(--card-foreground) / <alpha-value>)",
        sidebar:          "oklch(var(--sidebar) / <alpha-value>)",
        "sidebar-border": "oklch(var(--sidebar-border) / <alpha-value>)",
        "sidebar-foreground": "oklch(var(--sidebar-foreground) / <alpha-value>)",
        "sidebar-accent": "oklch(var(--sidebar-accent) / <alpha-value>)",
        border:           "oklch(var(--border) / <alpha-value>)",
        input:            "oklch(var(--input) / <alpha-value>)",
        ring:             "oklch(var(--ring) / <alpha-value>)",
        primary:          "oklch(var(--primary) / <alpha-value>)",
        "primary-foreground": "oklch(var(--primary-foreground) / <alpha-value>)",
        secondary:        "oklch(var(--secondary) / <alpha-value>)",
        "secondary-foreground": "oklch(var(--secondary-foreground) / <alpha-value>)",
        muted:            "oklch(var(--muted) / <alpha-value>)",
        "muted-foreground":"oklch(var(--muted-foreground) / <alpha-value>)",
        accent:           "oklch(var(--accent) / <alpha-value>)",
        "accent-foreground": "oklch(var(--accent-foreground) / <alpha-value>)",
        success:          "oklch(var(--success) / <alpha-value>)",
        "success-foreground": "oklch(var(--success-foreground) / <alpha-value>)",
        warning:          "oklch(var(--warning) / <alpha-value>)",
        "warning-foreground": "oklch(var(--warning-foreground) / <alpha-value>)",
        destructive:      "oklch(var(--destructive) / <alpha-value>)",
        "destructive-foreground": "oklch(var(--destructive-foreground) / <alpha-value>)",
        "chart-1":        "oklch(var(--chart-1) / <alpha-value>)",
        "chart-2":        "oklch(var(--chart-2) / <alpha-value>)",
        "chart-3":        "oklch(var(--chart-3) / <alpha-value>)",
        "chart-4":        "oklch(var(--chart-4) / <alpha-value>)",
        "chart-5":        "oklch(var(--chart-5) / <alpha-value>)",
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
