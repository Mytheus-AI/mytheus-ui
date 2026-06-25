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
        logo: ["var(--font-logo)", "var(--font-sans)", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
        display: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        paper: "var(--paper)",
        "paper-2": "var(--paper-2)",
        "paper-3": "var(--paper-3)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        signal: "var(--signal)",
        "signal-deep": "var(--signal-deep)",
        "block-deep": "var(--block-deep)",
        "block-deep-ink": "var(--block-deep-ink)",
        "block-soft": "var(--block-soft)",
        console: "var(--console)",
        "console-2": "var(--console-2)",
        "console-ink": "var(--console-ink)",
      },
    },
  },
  plugins: [],
};
export default config;
