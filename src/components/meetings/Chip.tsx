import type { ReactNode } from "react";

export type ChipTone = "neutral" | "accent" | "high" | "medium" | "low";

/* Tones read the app theme tokens, so both themes stay AA without per-theme overrides. Priority
   tones keep the frozen language: red acts now, amber needs attention, blue informs. */
const TONE: Record<ChipTone, string> = {
  neutral: "bg-bg-2 text-ink-2",
  accent: "bg-signal-soft text-signal-deep",
  high: "bg-priority-high-soft text-priority-high",
  medium: "bg-priority-medium-soft text-priority-medium",
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
      className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-semibold ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
