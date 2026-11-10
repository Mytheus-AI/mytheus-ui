import type { ReactNode } from "react";
import { MARK_PATH } from "@/components/Logo";

/* The tangle half of the brand mark, cropped square: it stands in for an agent wherever a face
   would go (avatars, video tiles). Decorative only. */
export function Tangle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 414" aria-hidden className={`h-auto ${className}`} fill="none">
      <path d={MARK_PATH} stroke="var(--signal)" strokeWidth={36} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const TONE = {
  peach: "bg-tint-peach",
  sage: "bg-tint-sage",
  ochre: "bg-tint-ochre",
  sky: "bg-tint-sky",
  accent: "bg-signal-soft",
} as const;

export type Tone = keyof typeof TONE;

/* A small round avatar: an initial on a paper tint, or the tangle for an agent. */
export function Av({ tone = "peach", agent = false, children }: { tone?: Tone; agent?: boolean; children?: ReactNode }) {
  return (
    <span
      className={`inline-grid h-[30px] w-[30px] flex-none place-items-center rounded-full text-[12.5px] font-bold text-ink ${TONE[tone]}`}
    >
      {agent ? <Tangle className="w-[70%]" /> : children}
    </span>
  );
}

/* Overlapping avatars for a window's title bar. */
export function AvStack({ label, people }: { label: string; people: { tone: Tone; initial?: string; agent?: boolean }[] }) {
  return (
    <span role="img" aria-label={label} className="flex">
      {people.map((p, i) => (
        <span key={i} className="-ml-[7px] flex rounded-full shadow-[0_0_0_2px_var(--surface)] first:ml-0">
          <Av tone={p.tone} agent={p.agent}>
            {p.initial}
          </Av>
        </span>
      ))}
    </span>
  );
}
