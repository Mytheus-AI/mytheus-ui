"use client";

import { useEffect } from "react";
import { dueRoutines, markRoutineRan } from "@/app/actions/myte-v2";
import { readyWords, routineThreadTitle } from "@/lib/ask-myte/routines";
import { ALL_SCOPE, type AskScope, type Routine } from "@/lib/ask-myte/types";
import { pushReadyRoutine } from "./nudges-client";
import { streamAsk } from "./stream";

/* Routines run when you open Mytheus (ADR-0049 F5): Myte has no session of its own, so once per
   browser session, when the page is idle, the app asks core-api which routines are due, runs
   each through the normal Ask Myte stream into a new thread titled after the routine, records the
   run (`POST /myte/routines/{id}/ran`), and leaves a nudge: "Your Monday update is ready". A run
   that fails is not recorded, so it is tried again next time. Renders nothing. */

const FLAG = "mx-myte-routines-ran";

async function runOne(r: Routine): Promise<string | null> {
  let threadId: string | null = null;
  const scope: AskScope = r.scope ? { ...ALL_SCOPE, ...r.scope } : ALL_SCOPE;
  await streamAsk(
    { question: r.question, scope, page: null, thread_title: routineThreadTitle(r), timezone: r.timezone },
    (ev) => {
      if (ev.event === "saved") threadId = ev.data.thread_id;
    },
  );
  return threadId;
}

export function RoutineRunner() {
  useEffect(() => {
    let cancelled = false;
    const go = async () => {
      if (cancelled) return;
      try {
        if (sessionStorage.getItem(FLAG)) return;
        sessionStorage.setItem(FLAG, "1");
      } catch {
        // storage blocked: run once per page load instead
      }
      const due = await dueRoutines().catch(() => [] as Routine[]);
      for (const r of due.slice(0, 5)) {
        if (cancelled) return;
        const threadId = await runOne(r);
        if (!threadId) continue;
        const ran = await markRoutineRan(r.id, threadId);
        if (ran.ok) pushReadyRoutine({ id: r.id, thread_id: threadId, words: readyWords(r), question: r.question });
      }
    };
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (h: number) => void };
    const handle = w.requestIdleCallback ? w.requestIdleCallback(() => void go(), { timeout: 8000 }) : window.setTimeout(() => void go(), 4000);
    return () => {
      cancelled = true;
      if (w.requestIdleCallback) w.cancelIdleCallback?.(handle);
      else window.clearTimeout(handle);
    };
  }, []);
  return null;
}
