"use client";

import { Warning } from "@phosphor-icons/react";
import "@/styles/meeting-transcript.css";

/* Shown when the transcript read fails with a real server answer (anything other than the
   not-found and no-backend cases the page already handles). The transcript itself is safe; this
   is only the read failing, and trying again re-runs it. */
export default function TranscriptError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="page">
      <div className="page-inner tx-inner">
        <div className="panel reveal tx-empty-page" style={{ margin: "24px auto 0", width: "100%" }}>
          <div className="tx-empty" role="alert">
            <span className="tx-empty-icon" aria-hidden style={{ color: "var(--accentDeep)" }}>
              <Warning size={28} weight="fill" />
            </span>
            <h3>Could not load this transcript</h3>
            <p>
              The transcript service did not respond. The transcript itself is safe, only the list
              failed to load.
            </p>
            <button type="button" onClick={reset} className="btn-accent-sm tap">
              Try again
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
