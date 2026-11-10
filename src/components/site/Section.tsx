import type { ReactNode } from "react";

/* Layout primitives for marketing pages. Every page is built from these so the rhythm, widths
   and the line's crossings stay consistent.

   Wrap      the content width (1120px) with the page gutter. The Thread reads `.site-wrap`.
   Section   vertical rhythm. `cross` lets the page-long line cross the page at its top edge;
             crossing sections need their default top padding and no background of their own.
   SectionHead  the two-column opener: serif title left, lead paragraph right.
   Stage     the warm rounded wash a product window sits on (`peach` or `ochre`).
   Win       a product window: white, rounded, warm shadow. WinBar is its title row.
   Chip      the small status pill; tones follow the frozen priority language plus `accent`.  */

export function Wrap({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`site-wrap mx-auto w-[min(1120px,100%-40px)] sm:w-[min(1120px,100%-80px)] ${className}`}>{children}</div>;
}

export function Section({
  id,
  cross = false,
  className = "",
  children,
}: {
  id?: string;
  cross?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      data-thread-cross={cross ? "" : undefined}
      className={`py-[clamp(64px,9vw,120px)] ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionHead({
  title,
  lead,
  className = "",
}: {
  title: ReactNode;
  lead?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={`mb-[clamp(32px,4.5vw,56px)] grid items-end gap-x-14 gap-y-[18px] md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] ${className}`}
    >
      <h2 className="display max-w-[17ch] text-[clamp(2.1rem,4.6vw,3.5rem)]">{title}</h2>
      {lead ? <p className="max-w-[52ch] text-[clamp(1.06rem,1.5vw,1.2rem)] leading-relaxed text-ink-3">{lead}</p> : null}
    </header>
  );
}

export function Stage({
  tone = "peach",
  glow = false,
  className = "",
  children,
}: {
  tone?: "peach" | "ochre";
  glow?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const bg = tone === "ochre" ? "var(--wash-ochre)" : "var(--wash)";
  return (
    <div
      className={`rounded-hero p-[clamp(12px,4.5vw,56px)] ${className}`}
      style={{ background: glow ? `var(--wash-glow), ${bg}` : bg }}
    >
      {children}
    </div>
  );
}

export function Win({ className = "", children, label }: { className?: string; children: ReactNode; label?: string }) {
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      className={`overflow-hidden rounded-card bg-surface shadow-warm-3 ${className}`}
    >
      {children}
    </div>
  );
}

export function WinBar({ title, meta, right }: { title: ReactNode; meta?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-[22px] py-4">
      <div className="mr-auto flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <b className="font-display text-[1.3rem] font-semibold tracking-[-0.01em] text-ink">{title}</b>
        {meta ? <span className="text-[14px] text-ink-3">{meta}</span> : null}
      </div>
      {right}
    </div>
  );
}

const CHIP: Record<string, string> = {
  neutral: "bg-bg-2 text-ink-2",
  accent: "bg-signal-soft text-signal-ink",
  high: "bg-priority-high-soft text-priority-high",
  medium: "bg-priority-medium-soft text-priority-medium",
  low: "bg-priority-low-soft text-priority-low",
  ok: "bg-ok-soft text-ok",
};

export function Chip({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: "neutral" | "accent" | "high" | "medium" | "low" | "ok";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-[0.7em] py-[0.22em] text-[13px] font-semibold leading-[1.35] ${CHIP[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/* A live indicator: a red dot and a label. Real state only. */
export function Live({ children = "Live" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-[7px] text-[14px] font-semibold text-priority-high">
      <span className="h-2 w-2 rounded-full bg-priority-high" aria-hidden />
      {children}
    </span>
  );
}
