"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { ArrowRight, GlobeHemisphereEast, X } from "@phosphor-icons/react";
import { savedTimeZone } from "@/app/actions/time-zone";
import { browserTimeZone } from "@/lib/timezone";
import { canonicalZone } from "@/lib/zone-aliases";

/* "Save your time zone": a small card at the foot of the app for a member whose saved time zone
   is still the UTC default while their browser says otherwise. Quiet hours, focus blocks, the
   evening digest and the ops console's map of where members are all read the saved zone, so an
   unsaved one quietly gets all of them wrong.

   - Shown after the page renders (a server action, never in the render path), and only when the
     saved zone is UTC and the browser's is not, so someone genuinely in UTC is never asked.
   - The X hides it for this sign-in: the dismissal is keyed to the Clerk session, so it comes back
     on the next sign-in until the zone is saved.
   - The card links to Settings > Listening at the time zone field, which is already pre-filled
     with the browser's zone. Hidden on that page; checked again on leaving it, so it disappears
     once the zone is saved. */

const KEY = "mx-tz-prompt-dismissed:";
const LISTENING = "/settings/listening";

function dismissed(sessionId: string): boolean {
  try {
    return window.localStorage.getItem(KEY + sessionId) === "1";
  } catch {
    return false;
  }
}

export function TimeZonePrompt() {
  const pathname = usePathname() ?? "";
  const { sessionId, isSignedIn } = useAuth();
  const [zone, setZone] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  // Re-check on the first page and whenever someone leaves the Listening page (they may have saved).
  const checkedAt = useRef<string | null>(null);

  useEffect(() => {
    const onListening = pathname.startsWith(LISTENING);
    if (onListening) {
      setShow(false);
      checkedAt.current = LISTENING;
      return;
    }
    if (!isSignedIn || !sessionId || dismissed(sessionId)) return;
    if (checkedAt.current !== null && checkedAt.current !== LISTENING) return;
    checkedAt.current = pathname;
    const mine = browserTimeZone();
    if (!mine || mine === "UTC" || mine === "Etc/UTC") return;
    let live = true;
    savedTimeZone()
      .then((saved) => {
        if (!live) return;
        setZone(canonicalZone(mine));
        setShow(saved === "UTC" || saved === "Etc/UTC");
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [pathname, sessionId, isSignedIn]);

  if (!show || !zone) return null;

  const close = () => {
    setShow(false);
    try {
      if (sessionId) window.localStorage.setItem(KEY + sessionId, "1");
    } catch {
      // Storage blocked: it simply comes back on the next page load.
    }
  };

  return (
    <div
      role="region"
      aria-label="Save your time zone"
      className="fixed inset-x-4 bottom-24 z-40 mx-auto max-w-[540px] sm:bottom-6"
    >
      <div className="flex items-center gap-1 rounded-card border border-line bg-surface p-1.5 shadow-warm-3">
        <Link
          href={`${LISTENING}#time-zone`}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-[14px] px-3 py-2.5 transition-colors duration-150 hover:bg-surface-2"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-signal-soft text-signal-ink" aria-hidden>
            <GlobeHemisphereEast size={20} weight="fill" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink">Please save your time zone</span>
            <span className="block text-[13px] leading-snug text-ink-3">
              Your Myte still reads your day in UTC. Save <span className="font-semibold text-ink-2">{zone.replace(/_/g, " ")}</span> so quiet
              hours and your digest match.
            </span>
          </span>
          <ArrowRight size={18} aria-hidden className="shrink-0 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
        <button
          type="button"
          onClick={close}
          aria-label="Dismiss until next sign-in"
          className="grid h-10 w-10 shrink-0 place-items-center self-start rounded-ctl text-ink-3 transition-colors duration-150 hover:bg-bg-2 hover:text-ink"
        >
          <X size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}
