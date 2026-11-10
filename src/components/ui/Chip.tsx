import type { ReactNode } from "react";

/* The one chip: status, priority, kind and count labels across the app (it replaces the
   dashboard's Chip, the old Badge styling and the hand-made count pills). Always carries text, and
   usually an icon, so colour is never the only signal. Frozen tones: red acts now, amber needs
   attention, blue informs, green is done; `accent` is the soft coral, `solid` the dark pill,
   `outline` a quiet ring, `glass` a translucent surface for chips that sit on the hero wash. */

export type ChipTone = "neutral" | "accent" | "high" | "medium" | "low" | "ok" | "solid" | "outline" | "glass";

const toneClass: Record<ChipTone, string> = {
  neutral: "bg-bg-2 text-ink-2",
  accent: "bg-signal-soft text-signal-ink",
  high: "bg-priority-high-soft text-priority-high",
  medium: "bg-priority-medium-soft text-priority-medium",
  low: "bg-priority-low-soft text-priority-low",
  ok: "bg-ok-soft text-ok",
  solid: "bg-pill text-pill-on",
  outline: "bg-transparent text-ink-3 ring-1 ring-inset ring-line-2",
  glass: "bg-[color-mix(in_srgb,var(--surface)_72%,transparent)] text-ink",
};

export const chipClass = (tone: ChipTone = "neutral", className = "") =>
  `inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[12.5px] font-semibold leading-[1.35] ${toneClass[tone]} ${className}`;

export function Chip({
  tone = "neutral",
  icon,
  children,
  className = "",
  title,
}: {
  tone?: ChipTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span title={title} className={chipClass(tone, className)}>
      {icon ? (
        <span aria-hidden className="inline-flex shrink-0">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );
}

/** A count in a quiet chip, read with its noun by screen readers ("3 waiting"). */
export function Count({ n, label, tone = "neutral" }: { n: number; label: string; tone?: ChipTone }) {
  return (
    <Chip tone={tone} className="tabular-nums">
      {n}
      <span className="sr-only"> {label}</span>
    </Chip>
  );
}
