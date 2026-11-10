import type { ReactNode } from "react";

export type ChipTone = "neutral" | "accent" | "ok" | "high" | "medium" | "low";

/* A chip on the meeting surfaces. Tones read the app theme tokens, so both themes hold AA without
   per-theme overrides. Priority tones keep the frozen language: red acts now, amber needs
   attention, blue informs; `ok` is done. Amber text is pulled toward ink (the raw token is 4.0:1
   on its soft fill); the mix lightens in dark mode, where ink is light. */
const TONE: Record<ChipTone, string> = {
  neutral: "bg-bg-2 text-ink-2",
  accent: "bg-signal-soft text-signal-ink",
  ok: "bg-ok-soft text-ok",
  high: "bg-priority-high-soft text-priority-high",
  medium: "bg-priority-medium-soft text-[color:color-mix(in_srgb,var(--priority-medium)_74%,var(--ink))]",
  low: "bg-priority-low-soft text-priority-low",
};

export function Chip({
  tone = "neutral",
  children,
  className = "",
  title,
}: {
  tone?: ChipTone;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12.5px] font-semibold leading-none ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
