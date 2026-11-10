"use client";

import { useEffect, useState } from "react";
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";
import type { RoomNotice } from "@/lib/realtime/connection";

/* How the room is connected, as one small pill centred under the top bar (polish program,
   Phase 0: one honest connection state). It speaks for both live links at once: the call (audio
   and video) and the meeting link (captions, the agent, chat, the shared agenda and cards). It
   says what is affected ("Agent paused, captions reconnecting") and disappears by itself when
   everything is back.

   A first join that finishes quickly shows nothing: "Joining the call" waits SHOW_AFTER_MS. A
   drop shows at once. An error stays, says why in plain words, and offers "Try again" when trying
   again can help. */

const SHOW_AFTER_MS = 700;

export function ConnectionPill({
  notice,
  joining,
  onRetry,
}: {
  /** From `roomConnection`: null when all is well. */
  notice: RoomNotice | null;
  /** The call is connecting for the first time. */
  joining: boolean;
  onRetry?: (what: NonNullable<RoomNotice["retry"]>) => void;
}) {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!joining) {
      setLate(false);
      return;
    }
    const id = window.setTimeout(() => setLate(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [joining]);

  if (notice?.tone === "error") {
    const retry = notice.retry;
    return (
      <div role="alert" className="cx-conn is-error">
        <WarningCircle size={18} weight="fill" aria-hidden />
        <span>{notice.text}</span>
        {retry ? (
          <button
            type="button"
            className="cx-conn-retry tap"
            onClick={() => (retry === "reload" ? window.location.reload() : onRetry?.(retry))}
          >
            <ArrowClockwise size={14} weight="bold" aria-hidden />
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  const text = notice?.text ?? (joining && late ? "Joining the call" : null);
  if (!text) return null;
  return (
    <div role="status" className="cx-conn">
      <span className="cx-conn-dots" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      <span>{text}</span>
    </div>
  );
}
