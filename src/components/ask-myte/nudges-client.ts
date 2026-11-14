"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { activeDismissals, buildNudges, dayOf, dismiss, visibleNudges, type Nudge, type NudgeInput } from "@/lib/ask-myte/nudges";
import { browserTimeZone } from "@/lib/timezone";

/* The browser side of Myte's nudges (ADR-0049 F2): the previous visit (for "new decisions since
   you were last here"), the day's dismissals, and routine results that are ready, shared by the
   floating Myte's bubble and Home's "Today from Myte" card. All of it is per-browser
   convenience; nothing here is a source of truth. */

const LAST_VISIT = "mx-myte-last-visit";
const PREV_VISIT = "mx-myte-prev-visit";
const DISMISSED = "mx-myte-nudges-dismissed";
const READY = "mx-myte-routines-ready";
export const NUDGES_EVENT = "mx-myte-nudges";

export type ReadyRoutine = NonNullable<NudgeInput["routinesReady"]>[number];

function read<T>(store: "local" | "session", key: string): T | null {
  try {
    const raw = (store === "local" ? localStorage : sessionStorage).getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(store: "local" | "session", key: string, value: unknown) {
  try {
    (store === "local" ? localStorage : sessionStorage).setItem(key, JSON.stringify(value));
  } catch {
    // storage blocked: nudges still work, they just forget
  }
}

/** The previous visit, fixed for this browser session; the stored "last visit" moves to now. */
export function previousVisit(): string | null {
  const known = read<{ at: string | null }>("session", PREV_VISIT);
  if (known) return known.at;
  const last = read<string>("local", LAST_VISIT);
  write("session", PREV_VISIT, { at: last });
  write("local", LAST_VISIT, new Date().toISOString());
  return last;
}

export function readyRoutines(): ReadyRoutine[] {
  return read<ReadyRoutine[]>("session", READY) ?? [];
}

export function pushReadyRoutine(r: ReadyRoutine) {
  write("session", READY, [...readyRoutines().filter((x) => x.id !== r.id), r].slice(-10));
  window.dispatchEvent(new Event(NUDGES_EVENT));
}

/** The nudges to show now, with Dismiss. `data` null while it loads. */
export function useNudges(data: Omit<NudgeInput, "now" | "timeZone" | "lastVisit" | "routinesReady"> | null, max: number) {
  const [tick, setTick] = useState(0);
  const [lastVisit, setLastVisit] = useState<string | null>(null);
  const [ready, setReady] = useState<ReadyRoutine[]>([]);
  const [dismissed, setDismissed] = useState<unknown>(null);

  useEffect(() => {
    setLastVisit(previousVisit());
    setReady(readyRoutines());
    setDismissed(read("local", DISMISSED));
    const sync = () => {
      setReady(readyRoutines());
      setDismissed(read("local", DISMISSED));
    };
    window.addEventListener(NUDGES_EVENT, sync);
    // "Starts in 10 minutes" moves with the clock.
    const t = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => {
      window.removeEventListener(NUDGES_EVENT, sync);
      window.clearInterval(t);
    };
  }, []);

  const nudges = useMemo<Nudge[]>(() => {
    if (!data) return [];
    const now = new Date();
    const timeZone = browserTimeZone();
    const all = buildNudges({ ...data, now, timeZone, lastVisit, routinesReady: ready });
    return visibleNudges(all, activeDismissals(dismissed, dayOf(now, timeZone)), max);
    // tick re-evaluates against the clock
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, lastVisit, ready, dismissed, max, tick]);

  const dismissNudge = useCallback((id: string) => {
    const today = dayOf(new Date(), browserTimeZone());
    const next = dismiss(read("local", DISMISSED), today, id);
    write("local", DISMISSED, next);
    setDismissed(next);
    window.dispatchEvent(new Event(NUDGES_EVENT));
  }, []);

  return { nudges, dismissNudge };
}
