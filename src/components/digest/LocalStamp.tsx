"use client";

import { useEffect, useState } from "react";

/* A date or time in words, in the viewer's own zone. The first render uses UTC, like every
   server-rendered date, so it hydrates cleanly; after mount it switches to the browser's clock.
   `time` "10:42 AM", `day` "Mon, Nov 17", `dayTime` "Mon, Nov 17 at 7:00 AM". */

type Mode = "time" | "day" | "dayTime";

const OPTIONS: Record<Mode, Intl.DateTimeFormatOptions> = {
  time: { hour: "numeric", minute: "2-digit" },
  day: { weekday: "short", month: "short", day: "numeric" },
  dayTime: { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
};

export function formatStamp(iso: string, mode: Mode, timeZone?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const text = new Intl.DateTimeFormat("en-US", { ...OPTIONS[mode], timeZone }).format(d);
  // "Monday, Nov 17, 7:00 AM" reads better as "Monday, Nov 17 at 7:00 AM".
  return mode === "dayTime" ? text.replace(/, (\d{1,2}:\d{2}\s?[AP]M)$/, " at $1") : text;
}

export function LocalStamp({ iso, mode }: { iso: string; mode: Mode }) {
  const [local, setLocal] = useState(false);
  useEffect(() => setLocal(true), []);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {formatStamp(iso, mode, local ? undefined : "UTC")}
    </time>
  );
}
