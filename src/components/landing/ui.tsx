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
 * PillCTA — the signature Playex call to action: a black text pill with a
 * separate circular arrow button tucked into its right edge. On hover the
 * circle slides and the whole thing lifts a touch (CSS only).
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
      className={`group inline-flex items-center transition-transform duration-300 ease-out hover:-translate-y-0.5 ${className}`}
    >
      <span className="-mr-4 inline-flex items-center rounded-pill bg-signal px-7 py-4 text-[15px] font-medium tracking-tight text-white">
        {children}
      </span>
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-signal text-white transition-colors duration-300 group-hover:bg-signal-deep">
        <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-0.5" />
      </span>
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
