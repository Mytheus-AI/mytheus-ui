"use client";

import { useEffect, useState } from "react";
import { relativeDay, upcomingWhen } from "@/lib/api/personal-types";

/** A date in words. The first render uses UTC, like every server-rendered date, so it hydrates
 *  cleanly; after mount it switches to the viewer's own clock. */
export function LocalWhen({ iso, nowIso, mode }: { iso: string; nowIso: string; mode: "upcoming" | "past" }) {
  const [local, setLocal] = useState(false);
  useEffect(() => setLocal(true), []);
  const zone = local ? "local" : "utc";
  const now = new Date(local ? Date.now() : Date.parse(nowIso));
  const text = mode === "upcoming" ? upcomingWhen(iso, now, zone) : relativeDay(iso, now, zone);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}
