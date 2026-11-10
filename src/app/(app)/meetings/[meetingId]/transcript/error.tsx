"use client";

import { ErrorState } from "@/components/ui/ErrorState";
import { Page } from "@/components/ui/Page";

/* Shown when the transcript read fails with a real server answer (anything other than the
   not-found and no-backend cases the page already handles). The transcript itself is safe; this
   is only the read failing, and trying again re-runs it. */
export default function TranscriptError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Page>
      <ErrorState
        variant="page"
        className="mt-6"
        title="Could not load this transcript"
        text="The transcript service did not respond. The transcript itself is safe, only the list failed to load."
        onRetry={reset}
      />
    </Page>
  );
}
