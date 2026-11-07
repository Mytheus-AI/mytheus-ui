import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, CloudSlash } from "@phosphor-icons/react/dist/ssr";
import { RetryButton } from "./RetryButton";

/* Small shared pieces for the Home screen. Server components; no state. */

export type ChipTone = "neutral" | "accent" | "high" | "medium" | "low" | "solid" | "glass";

const chipTone: Record<ChipTone, string> = {
  neutral: "bg-bg-2 text-ink-2",
  accent: "bg-signal-soft text-signal-deep",
  high: "bg-priority-high-soft text-priority-high",
  medium: "bg-priority-medium-soft text-priority-medium",
  low: "bg-priority-low-soft text-priority-low",
  solid: "bg-pill text-white",
  // Sits on the hero wash: a translucent surface so it reads in both themes.
  glass: "bg-[color-mix(in_srgb,var(--surface)_72%,transparent)] text-ink",
};

/** Status / priority / count chip. Always carries text, and usually an icon, so colour is never
 *  the only signal. */
export function Chip({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: ChipTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium leading-tight ${chipTone[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Staggered entrance. `motion-safe` so reduced-motion users get the final state at once. */
export function reveal(i: number): { className: string; style: CSSProperties } {
  return {
    className: "motion-safe:animate-[fadeUp_0.45s_var(--ease-out)_both]",
    style: { animationDelay: `${i * 60}ms` },
  };
}

/** Quiet text link with an arrow: hover, focus-visible (global ring) and active states. */
export const textLinkClass =
  "group/link inline-flex min-h-[40px] items-center gap-1 rounded-pill px-1 text-[13px] font-semibold text-signal-deep underline-offset-4 transition-colors duration-150 hover:underline active:opacity-70";

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={textLinkClass}>
      {children}
      <ArrowRight
        size={12}
        weight="bold"
        aria-hidden
        className="transition-transform duration-150 motion-safe:group-hover/link:translate-x-0.5"
      />
    </Link>
  );
}

/** Card header: sans title on the left, optional control on the right. */
export function CardHead({
  id,
  title,
  right,
}: {
  id: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-[18px] pb-2.5 pt-4 sm:px-[22px] sm:pt-[18px]">
      <h2 id={id} className="text-[15px] font-semibold text-ink">
        {title}
      </h2>
      {right}
    </div>
  );
}

/** A composed empty state inside a card: icon, one line of what it is, one line of what to do. */
export function EmptyBlock({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-6 pb-8 pt-6 text-center">
      <div className="mx-auto mb-3.5 grid h-12 w-12 place-items-center rounded-full bg-bg-2 text-ink-3">
        {icon}
      </div>
      <h3 className="text-[16px] font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-[40ch] text-[14px] text-ink-3">{text}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

/** A failed read. Distinct from empty: it says we could not load, and offers a real retry. */
export function ErrorBlock({ title, text }: { title: string; text: string }) {
  return (
    <div
      role="alert"
      className="mx-[18px] mb-[18px] mt-1.5 flex items-start gap-3.5 rounded-pill bg-bg-2 p-5 sm:mx-[22px] sm:mb-[22px]"
    >
      <CloudSlash size={24} aria-hidden className="mt-0.5 shrink-0 text-priority-medium" />
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        <p className="mb-3.5 mt-1 max-w-[46ch] text-[13.5px] text-ink-3">{text}</p>
        <RetryButton />
      </div>
    </div>
  );
}
