import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        bg: "var(--bg)",
        "bg-2": "var(--bg-2)",
        "bg-3": "var(--bg-3)",
        surface: "var(--surface)",
        ink: "var(--ink)",
        "ink-display": "var(--ink-display)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        line: "var(--line)",
        "line-2": "var(--line-2)",
        "line-strong": "var(--line-2)", // compat: CTAButton ghost variant
        signal: "var(--signal)",
        "signal-deep": "var(--signal-deep)",
        "signal-bright": "var(--signal-bright)",
        "signal-soft": "var(--signal-soft)",
        pill: "var(--pill)",
        "priority-high": "var(--priority-high)",
        "priority-high-soft": "var(--priority-high-soft)",
        "priority-medium": "var(--priority-medium)",
        "priority-medium-soft": "var(--priority-medium-soft)",
        "priority-low": "var(--priority-low)",
        "priority-low-soft": "var(--priority-low-soft)",
        // compat aliases so any legacy component still resolves a color
        paper: "var(--bg)",
        "ink-soft": "var(--ink-3)",
      },
      borderRadius: {
        pill: "var(--radius-pill)",
        card: "var(--radius-card)",
      },
    },
  },
  plugins: [],
};
export default config;
