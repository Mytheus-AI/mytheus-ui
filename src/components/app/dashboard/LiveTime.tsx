"use client";

import { useEffect, useState } from "react";
import {
  countdownParts,
  formatClock,
  greetingForHour,
  relativeLabel,
} from "./format";

/* The only client islands on Home that read the clock. Each starts from values the server also
   computed, so hydration matches, then takes over in an effect. */

function useNow(initialNow: number, everyMs: number): number {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), everyMs);
    return () => window.clearInterval(id);
  }, [everyMs]);
  return now;
}

/** "in 24 min", refreshed every 15 seconds. */
export function RelativeStart({
  startIso,
  initialNow,
}: {
  startIso: string;
  initialNow: number;
}) {
  const now = useNow(initialNow, 15_000);
  return <>{relativeLabel(Date.parse(startIso) - now)}</>;
}

/** The large serif countdown in the hero. Decorative: the chip beside it carries the same
 *  information to assistive tech, so this is hidden from it. */
export function CountdownDigits({
  startIso,
  initialNow,
}: {
  startIso: string;
  initialNow: number;
}) {
  const now = useNow(initialNow, 1_000);
  const { value, label } = countdownParts(Date.parse(startIso) - now);
  return (
    <div className="shrink-0 text-right" aria-hidden>
      <span className="display block text-[36px] leading-none text-ink sm:text-[44px]">
        {value}
      </span>
      <span className="mt-1 block text-[12.5px] font-semibold text-ink-2">{label}</span>
    </div>
  );
}

type Variant = "clock" | "range" | "when";

function formatLocal(variant: Variant, iso: string, endIso?: string): string {
  const clock = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
  if (variant === "clock") return clock.format(new Date(iso));
  if (variant === "range") {
    const start = clock.format(new Date(iso));
    return endIso ? `${start} to ${clock.format(new Date(endIso))}` : start;
  }
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatUtc(variant: Variant, iso: string, endIso?: string): string {
  if (variant === "clock") return formatClock(iso);
  if (variant === "range") {
    return endIso ? `${formatClock(iso)} to ${formatClock(endIso)}` : formatClock(iso);
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** A time shown in the viewer's own timezone. The server cannot know it, so the server render
 *  and the first client render use UTC (kept invisible, same width) and the local value takes
 *  over after mount. */
export function LocalTime({
  iso,
  endIso,
  variant = "clock",
  className = "",
}: {
  iso: string;
  endIso?: string;
  variant?: Variant;
  className?: string;
}) {
  const [local, setLocal] = useState<string | null>(null);
  useEffect(() => {
    setLocal(formatLocal(variant, iso, endIso));
  }, [variant, iso, endIso]);
  return (
    <time dateTime={iso} className={`${local === null ? "invisible" : ""} ${className}`}>
      {local ?? formatUtc(variant, iso, endIso)}
    </time>
  );
}

/** "Good evening" by the viewer's own hour. Same approach as LocalTime. */
export function Greeting({ initialIso }: { initialIso: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    setText(greetingForHour(new Date().getHours()));
  }, []);
  return (
    <span className={text === null ? "invisible" : ""}>
      {text ?? greetingForHour(new Date(initialIso).getUTCHours())}
    </span>
  );
}
