import type { CSSProperties, ReactNode } from "react";
import { InView } from "@/components/site/InView";
import { MARK_PATH } from "@/components/Logo";

/* Small building blocks shared by the feature-page product windows.

   Timed moments are CSS only: a window's body sits in <Demo>, which is an InView with `group`, so
   it gains `.in` once it scrolls into view. Elements inside use the class strings below, keyed on
   `group-[.in]`, with their delay set through the `--dl` style var (see `dl()`). Under
   prefers-reduced-motion every element renders in its final state from the start. */

export function Demo({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <InView threshold={0.35} className={`group ${className}`}>
      {children}
    </InView>
  );
}

/** The `--dl` delay for a timed element, in seconds. */
export function dl(seconds: number): CSSProperties {
  return { ["--dl" as string]: `${seconds}s` } as CSSProperties;
}

/** Delay and easing for a timed transition; pair with a duration and a `dl()` style. */
export const TIMED = "motion-safe:[transition-delay:var(--dl)] motion-safe:ease-[var(--ease-out)]";
const T = TIMED;

/** Hidden until the demo runs, then fades and settles in. */
export const APPEAR = `motion-safe:translate-y-1.5 motion-safe:opacity-0 group-[.in]:translate-y-0 group-[.in]:opacity-100 motion-safe:transition-[opacity,transform] motion-safe:duration-500 ${T}`;

/** The "before" half of a swap: shown first, gone once the demo runs. */
export const SWAP_OUT = `group-[.in]:invisible group-[.in]:opacity-0 motion-reduce:invisible motion-reduce:opacity-0 motion-safe:transition-[opacity,visibility] motion-safe:duration-300 ${T}`;

/** The "after" half of a swap: stacked on the same grid cell, shown once the demo runs. */
export const SWAP_IN = `invisible opacity-0 group-[.in]:visible group-[.in]:opacity-100 motion-reduce:visible motion-reduce:opacity-100 motion-safe:transition-[opacity,visibility] motion-safe:duration-300 ${T}`;

/** Put SWAP_OUT and SWAP_IN children in this so they share one cell. */
export function Swap({ className = "", children }: { className?: string; children: ReactNode }) {
  return <span className={`grid [&>*]:[grid-area:1/1] ${className}`}>{children}</span>;
}

export const TINT = {
  peach: "bg-tint-peach",
  ochre: "bg-tint-ochre",
  sage: "bg-tint-sage",
  sky: "bg-tint-sky",
} as const;
export type Tint = keyof typeof TINT;

/** A person: initial on a paper tint. */
export function Av({ name, tint = "peach", size = 30 }: { name: string; tint?: Tint; size?: 26 | 30 | 36 }) {
  const dim = size === 36 ? "h-9 w-9 text-[14px]" : size === 26 ? "h-[26px] w-[26px] text-[12.5px]" : "h-[30px] w-[30px] text-[13px]";
  return (
    <span aria-hidden className={`inline-grid flex-none place-items-center rounded-full font-bold text-ink ${TINT[tint]} ${dim}`}>
      {name.slice(0, 1)}
    </span>
  );
}

/** An agent: the Mytheus mark on soft coral. */
export function AgentAv({ size = 30 }: { size?: 26 | 30 | 36 | 44 }) {
  const dim = size === 44 ? "h-11 w-11" : size === 36 ? "h-9 w-9" : size === 26 ? "h-[26px] w-[26px]" : "h-[30px] w-[30px]";
  return (
    <span aria-hidden className={`inline-grid flex-none place-items-center rounded-full bg-signal-soft ${dim}`}>
      <svg viewBox="0 0 802 414" className="h-auto w-[72%]" fill="none">
        <path d={MARK_PATH} stroke="var(--signal-deep)" strokeWidth={44} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** Overlapping avatars, as in a window title bar. */
export function Avs({ children }: { children: ReactNode }) {
  return <span className="flex [&>*:not(:first-child)]:-ml-[7px] [&>*]:shadow-[0_0_0_2px_var(--surface)]">{children}</span>;
}

/** A drawn product control. Not interactive: the windows are pictures of the product. */
export function Ctl({ kind = "dark", children }: { kind?: "dark" | "outline" | "ghost"; children: ReactNode }) {
  const k =
    kind === "dark"
      ? "bg-pill text-pill-on"
      : kind === "outline"
        ? "border border-line-2 bg-surface text-ink"
        : "text-ink-3";
  return (
    <span className={`inline-flex h-9 items-center whitespace-nowrap rounded-ctl px-3.5 text-[14px] font-semibold ${k}`}>
      {children}
    </span>
  );
}

/** A small label inside a window panel. A paragraph, not a heading: windows are labelled images,
    so they never take part in the page's heading outline. */
export function PanelLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`mb-3 text-[14px] font-semibold text-ink-3 ${className}`}>{children}</p>;
}
