"use client";

import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import "@/styles/meeting-transcript.css";

/* Shown when the transcript read fails with a real server answer (anything other than the
   not-found and no-backend cases the page already handles). The transcript itself is safe; this
   is only the read failing, and trying again re-runs it. */
export default function TranscriptError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-page tx">
      <div className="mx-card tx-error-card" role="alert">
        <WarningCircle size={34} weight="fill" aria-hidden className="tx-error-ico" />
        <h2>Could not load this transcript</h2>
        <p>The transcript service did not respond. The transcript itself is safe, only the list failed to load.</p>
        <Button onClick={reset}>
          <ArrowClockwise size={18} weight="bold" aria-hidden />
          Try again
        </Button>
      </div>
    </div>
  );
}
