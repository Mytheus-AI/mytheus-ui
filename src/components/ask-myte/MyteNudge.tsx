"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "@phosphor-icons/react";
import { myteNudgeData, type NudgeData } from "@/app/actions/myte-v2";
import type { Nudge } from "@/lib/ask-myte/nudges";
import { useNudges } from "./nudges-client";

/* The floating Myte's speech bubble (ADR-0049 F2): at most one nudge at a time, above the
   floating button, in the Myte's own words ("Test starts in 10 minutes. Want a 30-second prep?").
   It never takes focus: it is announced politely once and waits. Its button asks the opener in
   the sheet (or opens the Inbox or the routine's answer); Dismiss hides it for the rest of the
   day. It fades in calmly, and appears in place under reduced motion. Reads come from the same
   endpoints Home uses, once after the page settles and then every five minutes while visible. */

const REFRESH_MS = 5 * 60_000;

export function MyteNudge({ name, hidden, onAsk }: { name: string; hidden: boolean; onAsk: (question: string) => void }) {
  const router = useRouter();
  const [data, setData] = useState<NudgeData | null>(null);
  const [shown, setShown] = useState(false);
  const { nudges, dismissNudge } = useNudges(data, 1);

  useEffect(() => {
    let live = true;
    const load = () => {
      if (document.visibilityState !== "visible") return;
      void myteNudgeData()
        .then((d) => live && setData(d))
        .catch(() => {});
    };
    // After the page has settled, so the nudge never competes with first paint.
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (h: number) => void };
    const first = w.requestIdleCallback ? w.requestIdleCallback(load, { timeout: 4000 }) : window.setTimeout(load, 2500);
    const t = window.setInterval(load, REFRESH_MS);
    return () => {
      live = false;
      if (w.requestIdleCallback) w.cancelIdleCallback?.(first);
      else window.clearTimeout(first);
      window.clearInterval(t);
    };
  }, []);

  const nudge: Nudge | undefined = nudges[0];
  useEffect(() => {
    if (!nudge) return setShown(false);
    const t = window.setTimeout(() => setShown(true), 1200);
    return () => window.clearTimeout(t);
  }, [nudge]);

  if (!nudge || hidden || !shown) return null;

  const act = () => {
    dismissNudge(nudge.id);
    if (nudge.action.type === "ask") onAsk(nudge.action.question);
    else router.push(nudge.action.href);
  };

  return (
    <div
      role="region"
      aria-label={`From ${name}`}
      className="fixed bottom-[calc(max(16px,env(safe-area-inset-bottom))+68px)] right-4 z-40 w-[min(320px,calc(100vw-32px))] mx-nudge sm:bottom-[92px] sm:right-6"
    >
      <div className="relative rounded-card border border-line bg-surface p-4 pr-11 shadow-warm-2">
        <p className="text-[13px] font-semibold text-ink-3">{name}</p>
        <p className="mt-0.5 text-[15px] leading-snug text-ink" aria-live="polite">
          {nudge.text}
        </p>
        <button type="button" onClick={act} className="mt-3 inline-flex h-9 items-center rounded-ctl bg-pill px-3.5 text-[14px] font-semibold text-pill-on transition-colors hover:bg-pill-2">
          {nudge.cta}
        </button>
        <button
          type="button"
          onClick={() => dismissNudge(nudge.id)}
          aria-label="Dismiss for today"
          title="Dismiss for today"
          className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-ctl text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink"
        >
          <X size={16} aria-hidden />
        </button>
        {/* the tail, pointing at the floating Myte */}
        <span aria-hidden className="absolute -bottom-[7px] right-7 h-3.5 w-3.5 rotate-45 border-b border-r border-line bg-surface" />
      </div>
    </div>
  );
}
