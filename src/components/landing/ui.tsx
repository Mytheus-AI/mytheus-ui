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
      className={`group inline-flex items-center gap-2.5 rounded-pill bg-signal py-4 pl-7 pr-6 text-[15px] font-medium tracking-tight text-white shadow-[0_20px_44px_-18px_rgba(189,93,58,0.85)] transition-colors duration-300 hover:bg-signal-deep ${className}`}
    >
      {children}
      <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-0.5" />
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
      className={`pill-surface inline-flex items-center justify-center rounded-pill px-6 py-3 text-[15px] font-medium text-ink-2 transition-colors duration-300 hover:text-ink ${className}`}
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
