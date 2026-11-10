import Link from "next/link";
import type { ReactNode } from "react";

/* ================================================================== */
/*  Playex-style UI atoms — pills, circular icon buttons, glossy 3D    */
/*  orbs (pure CSS), icon glyphs. Server components; motion is CSS.     */
/* ================================================================== */

/* ---------------- icons ---------------- */

export function ArrowRight({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 12h13m0 0-5.5-5.5M18 12l-5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Plus({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Play({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor" className={className} aria-hidden>
      <path d="M2.5 1.5v9l8-4.5-8-4.5Z" />
    </svg>
  );
}

/* ---------------- buttons ---------------- */

/**
 * PillCTA — the primary call to action: one clean signal pill with an
 * inline arrow, the same language as the header and closing CTAs. Static
 * by design — hover only deepens the color and nudges the arrow; no lift,
 * no drift.
 */
export function PillCTA({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-[52px] items-center justify-center whitespace-nowrap rounded-ctl border border-pill bg-pill px-6 text-[16px] font-semibold leading-none text-pill-on transition-[background-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:bg-pill-2 hover:shadow-warm-2 active:translate-y-0 active:shadow-none ${className}`}
    >
      {children}
    </Link>
  );
}

/** OutlinePill — the soft white/bordered pill used for nav + Sign In. */
export function OutlinePill({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-11 items-center justify-center whitespace-nowrap rounded-ctl border border-line-2 bg-surface px-[18px] text-[15px] font-semibold text-ink transition-colors duration-150 hover:bg-surface-2 ${className}`}
    >
      {children}
    </Link>
  );
}

/** IconCircle — a round button (arrow / plus / play). `tone` sets the look. */
export function IconCircle({
  children,
  tone = "ink",
  className = "",
}: {
  children: ReactNode;
  tone?: "ink" | "light" | "signal";
  className?: string;
}) {
  const look =
    tone === "ink"
      ? "bg-pill text-white"
      : tone === "signal"
        ? "bg-signal text-white"
        : "bg-white text-ink border border-line";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full ${look} ${className}`}
    >
      {children}
    </span>
  );
}

/* ---------------- misc ---------------- */

export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={`kicker ${className}`}>{children}</p>;
}

/** Small icon chip used at the top-left of feature cards. */
export function IconChip({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-pill text-white ${className}`}
    >
      {children}
    </span>
  );
}
