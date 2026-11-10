"use client";

import { useEffect, useState } from "react";
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";

/* How the call is connecting, as one small light pill centred under the top bar instead of a
   full-width card. A connect that finishes quickly shows nothing at all: the pill waits SHOW_AFTER_MS
   before appearing, so the usual sub-second join is not a flash of "Connecting". Reconnecting
   shows at once (the call was working and now is not). An error stays until you act on it. */

const SHOW_AFTER_MS = 700;

export function ConnectionPill({
  status,
  message,
}: {
  status:
    "connecting" | "reconnecting" | "error" | "connected" | "unconfigured";
  /** The plain-words reason, shown only for an error. */
  message?: string;
}) {
  const waiting = status === "connecting";
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!waiting) {
      setLate(false);
      return;
    }
    const id = window.setTimeout(() => setLate(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [waiting]);

  if (status === "error") {
    return (
      <div role="alert" className="cx-conn is-error">
        <WarningCircle size={18} weight="fill" aria-hidden />
        <span>{message}</span>
        <button
          type="button"
          className="cx-conn-retry tap"
          onClick={() => window.location.reload()}
        >
          <ArrowClockwise size={14} weight="bold" aria-hidden />
          Try again
        </button>
      </div>
    );
  }

  const show = status === "reconnecting" || (waiting && late);
  if (!show) return null;
  return (
    <div role="status" className="cx-conn">
      <span className="cx-conn-dots" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      <span>
        {status === "reconnecting" ? "Reconnecting" : "Joining the call"}
      </span>
    </div>
  );
}
