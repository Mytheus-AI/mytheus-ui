"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowClockwise, ArrowLeft, WarningCircle } from "@phosphor-icons/react";
import "@/components/room/room-polish.css";

/* A call page could not load (the meeting service unreachable, a failed read). Says so in plain
   words, offers Try again (re-renders the route) and a way back, never a blank screen. */

export default function CallError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaced to the browser console for whoever is debugging; nothing sensitive is in it.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-meet cx-call call-state">
      <main className="call-state-main" id="page-call-error">
        <section className="call-state-card" role="alert" aria-labelledby="call-error-h">
          <WarningCircle size={28} weight="fill" aria-hidden className="call-state-icon" />
          <h1 id="call-error-h">The meeting could not be opened</h1>
          <p>
            We could not reach the meeting just now. Your meeting is fine; this is a connection problem. Try again in a
            moment.
          </p>
          <div className="call-state-acts">
            <button type="button" className="nfy-act tap" onClick={reset}>
              <ArrowClockwise size={16} weight="bold" aria-hidden />
              Try again
            </button>
            <Link href="/meetings" className="nfy-act is-quiet tap">
              <ArrowLeft size={16} weight="bold" aria-hidden />
              All meetings
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
