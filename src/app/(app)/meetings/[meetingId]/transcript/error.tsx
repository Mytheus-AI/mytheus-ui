"use client";

import { Warning } from "@phosphor-icons/react";
import { PanelEmpty } from "@/components/meetings/PanelEmpty";

/* Shown when the transcript read fails with a real server answer (anything other than the
   not-found and no-backend cases the page already handles). The transcript itself is safe; this
   is only the read failing, and trying again re-runs it. */
export default function TranscriptError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-6xl py-6">
      <PanelEmpty
        role="alert"
        className="mx-auto max-w-[640px]"
        icon={<Warning size={34} weight="fill" className="text-priority-high" />}
        title="Could not load this transcript"
        description="The transcript service did not respond. The transcript itself is safe, only the list failed to load."
        action={
          <button
            type="button"
            onClick={reset}
            className="h-11 rounded-pill bg-pill px-5 text-[14px] font-semibold text-white transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98]"
          >
            Try again
          </button>
        }
      />
    </div>
  );
}
