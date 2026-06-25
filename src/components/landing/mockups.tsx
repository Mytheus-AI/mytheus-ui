import type { ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Reusable app-mockup building blocks. Large rounded corners + soft   */
/*  shadow, a calm window chrome, and a handful of content atoms the    */
/*  section mockups compose from. Purely presentational.                */
/* ------------------------------------------------------------------ */

/** A floating app window: rounded, shadowed, with an optional title bar. */
export function MockWindow({
  title,
  meta,
  children,
  tone = "light",
  className = "",
}: {
  title?: string;
  meta?: string;
  children: ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div
      className={`overflow-hidden rounded-2xl border shadow-[0_30px_60px_-28px_rgba(29,24,37,0.45)] backdrop-blur-sm ${
        dark
          ? "border-console-line bg-console/95"
          : "border-line bg-white/85"
      } ${className}`}
    >
      <div
        className={`flex items-center justify-between border-b px-4 py-2.5 ${
          dark ? "border-console-line bg-console-2/50" : "border-line bg-paper-2/60"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-signal/80" />
          <span
            className={`h-2.5 w-2.5 rounded-full ${dark ? "bg-console-ink/20" : "bg-ink/15"}`}
          />
          <span
            className={`h-2.5 w-2.5 rounded-full ${dark ? "bg-console-ink/20" : "bg-ink/15"}`}
          />
          {title && (
            <span
              className={`ml-2 text-[0.74rem] font-medium ${
                dark ? "text-console-ink/80" : "text-ink/80"
              }`}
            >
              {title}
            </span>
          )}
        </div>
        {meta && (
          <span
            className={`font-mono text-[0.62rem] tabular-nums ${
              dark ? "text-console-ink/45" : "text-ink-soft/70"
            }`}
          >
            {meta}
          </span>
        )}
      </div>
      <div className={dark ? "text-console-ink" : "text-ink"}>{children}</div>
    </div>
  );
}

/** A captured note line with a small bullet/marker. */
export function NoteLine({
  children,
  dim = false,
  dark = false,
  accent = false,
}: {
  children: ReactNode;
  dim?: boolean;
  dark?: boolean;
  accent?: boolean;
}) {
  return (
    <li className="flex gap-2.5">
      <span
        className={`mt-[0.5rem] h-1.5 w-1.5 flex-none rounded-full ${
          accent ? "bg-signal" : dark ? "bg-console-ink/30" : "bg-ink/25"
        }`}
      />
      <span
        className={`text-[0.86rem] leading-snug ${
          dim
            ? dark
              ? "text-console-ink/55"
              : "text-ink-soft"
            : dark
              ? "text-console-ink/85"
              : "text-ink/85"
        }`}
      >
        {children}
      </span>
    </li>
  );
}

/** A small circular avatar with initials. */
export function Avatar({
  initials,
  className = "",
  ring = false,
}: {
  initials: string;
  className?: string;
  ring?: boolean;
}) {
  return (
    <span
      className={`grid place-items-center rounded-full bg-signal/15 font-mono text-[0.62rem] font-bold text-signal-deep ${
        ring ? "ring-2 ring-signal/40" : ""
      } ${className}`}
    >
      {initials}
    </span>
  );
}

/** A small label chip. */
export function Chip({
  children,
  accent = false,
  dark = false,
}: {
  children: ReactNode;
  accent?: boolean;
  dark?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[0.58rem] uppercase tracking-wider ${
        accent
          ? "border-signal/50 text-signal"
          : dark
            ? "border-console-ink/20 text-console-ink/55"
            : "border-line-strong text-ink-soft"
      }`}
    >
      {children}
    </span>
  );
}
