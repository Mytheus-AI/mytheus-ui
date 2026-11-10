"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/site/Section";

/* The one captured decision in the room demo. Nothing is kept until you confirm it; confirming
   turns its chip green and says where it went. */
export function ConfirmDecision() {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <li className="rounded-ctl border border-line bg-surface px-4 py-3.5">
      <Chip tone={confirmed ? "ok" : "accent"} className="transition-colors duration-200">
        {confirmed ? "Decision, confirmed" : "Decision"}
      </Chip>
      <p className="mt-1.5 font-medium leading-[1.35] text-ink">Q3 launch targeted for August 12.</p>
      <div className="mt-3 flex min-h-10 flex-wrap items-center gap-x-3 gap-y-2">
        <Button type="button" disabled={confirmed} onClick={() => setConfirmed(true)}>
          {confirmed ? "Confirmed" : "Confirm"}
        </Button>
        <span aria-live="polite" className="text-[14.5px] text-ink-3">
          {confirmed ? "Added to shared memory." : "Waiting for your tap."}
        </span>
      </div>
    </li>
  );
}
