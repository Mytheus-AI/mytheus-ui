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
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        bg: "var(--bg)",
        "bg-2": "var(--bg-2)",
        "bg-3": "var(--bg-3)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        ink: "var(--ink)",
        "ink-display": "var(--ink-display)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        "ink-4": "var(--ink-4)",
        line: "var(--line)",
        "line-2": "var(--line-2)",
        "line-strong": "var(--line-2)", // compat: CTAButton ghost variant
        signal: "var(--signal)",
        "signal-deep": "var(--signal-deep)",
        "signal-bright": "var(--signal-bright)",
        "signal-soft": "var(--signal-soft)",
        "signal-line": "var(--signal-line)",
        "signal-ink": "var(--signal-ink)",
        pill: "var(--pill)",
        "pill-2": "var(--pill-2)",
        "pill-on": "var(--pill-on)",
        ok: "var(--ok)",
        "ok-soft": "var(--ok-soft)",
        "tint-peach": "var(--tint-peach)",
        "tint-ochre": "var(--tint-ochre)",
        "tint-sage": "var(--tint-sage)",
        "tint-sky": "var(--tint-sky)",
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
        ctl: "var(--radius-pill)",
        card: "var(--radius-card)",
        hero: "var(--radius-hero)",
      },
      boxShadow: {
        "warm-1": "var(--sh-1)",
        "warm-2": "var(--sh-2)",
        "warm-3": "var(--sh-3)",
      },
      backgroundImage: {
        wash: "var(--wash)",
        "wash-ochre": "var(--wash-ochre)",
        "wash-glow": "var(--wash-glow)",
      },
    },
  },
  plugins: [],
};
export default config;
