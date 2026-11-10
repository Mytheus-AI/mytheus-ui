import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CloudSlash } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/EmptyState";
import { RetryButton } from "./RetryButton";

/* Small shared pieces for the Home screen. Server components; no state. */

export type ChipTone = "neutral" | "accent" | "high" | "medium" | "low" | "ok" | "solid" | "glass";

/* Frozen tones: red acts now, amber needs attention, blue informs, green is done. */
const chipTone: Record<ChipTone, string> = {
  neutral: "bg-bg-2 text-ink-2",
  accent: "bg-signal-soft text-signal-ink",
  high: "bg-priority-high-soft text-priority-high",
  medium: "bg-priority-medium-soft text-priority-medium",
  low: "bg-priority-low-soft text-priority-low",
  ok: "bg-ok-soft text-ok",
  solid: "bg-pill text-pill-on",
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
      className={`inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[12.5px] font-semibold leading-[1.35] ${chipTone[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Quiet text link with an arrow: hover, focus-visible (global ring) and active states. */
export const textLinkClass =
  "group/link inline-flex min-h-[40px] items-center gap-1 rounded-ctl px-1 text-[13.5px] font-semibold text-signal-ink underline-offset-4 transition-colors duration-150 hover:underline active:opacity-70";

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

/** The white card every Home panel sits in. */
export const cardClass = "overflow-hidden rounded-card border border-line bg-surface shadow-warm-1";

/** Card header: title on the left (optionally a quiet serif caption under it), a control on the
 *  right. */
export function CardHead({
  id,
  title,
  caption,
  right,
}: {
  id: string;
  title: string;
  caption?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-[18px] pb-2.5 pt-4 sm:px-[22px] sm:pt-[18px]">
      <div className="min-w-0">
        <h2 id={id} className="text-[16px] font-semibold leading-snug text-ink">
          {title}
        </h2>
        {caption ? <p className="font-display text-[15px] italic leading-snug text-ink-3">{caption}</p> : null}
      </div>
      {right ? <div className="-my-2 flex shrink-0 items-center">{right}</div> : null}
    </div>
  );
}

/** An empty panel inside a card: the shared EmptyState (with its small drawn line), without its
 *  own box, since the card is already the box. */
export function CardEmpty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <EmptyState
      title={title}
      description={text}
      action={action}
      className="!rounded-none !border-0 !bg-transparent !px-6 !pb-8 !pt-5"
    />
  );
}

/** A failed read. Distinct from empty: it says we could not load, and offers a real retry. */
export function ErrorBlock({ title, text }: { title: string; text: string }) {
  return (
    <div
      role="alert"
      className="mx-[18px] mb-[18px] mt-1.5 flex items-start gap-3.5 rounded-ctl bg-bg-2 p-5 sm:mx-[22px] sm:mb-[22px]"
    >
      <CloudSlash size={24} aria-hidden className="mt-0.5 shrink-0 text-priority-medium" />
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        <p className="mb-3.5 mt-1 max-w-[46ch] text-[14px] text-ink-3">{text}</p>
        <RetryButton />
      </div>
    </div>
  );
}
