"use client";

import { createContext, useContext, type ReactNode } from "react";
import Link from "next/link";
import { Lightning } from "@phosphor-icons/react";
import { useOrgContext } from "@/lib/org-context";

/* Whether AI is paused for this workspace (ADR-0051 D2: the allowance is used up), read once in
   the (app) layout from billing-metering-service `GET /billing/status` and handed down here so
   every AI surface can say so instead of letting someone type into a Myte that will refuse.
   The server is still the guarantee: the agent tier's budget gate refuses every model call and
   core-api refuses a new meeting. This only decides how the pause appears. */

const AiStatus = createContext(false);

export function AiStatusProvider({ paused, children }: { paused: boolean; children: ReactNode }) {
  return <AiStatus.Provider value={paused}>{children}</AiStatus.Provider>;
}

export function useAiPaused(): boolean {
  return useContext(AiStatus);
}

export const AI_PAUSED_TITLE = "AI is paused for this workspace";

/** The one paused note, where an AI control would be: what is off, and the way back on. */
export function AiPausedNote({ what, className = "" }: { what: string; className?: string }) {
  const { user } = useOrgContext();
  const admin = user.role === "admin";
  return (
    <div role="status" className={`flex items-start gap-3 rounded-card border border-line bg-priority-high-soft px-4 py-3.5 text-left ${className}`}>
      <Lightning size={18} weight="fill" aria-hidden className="mt-0.5 shrink-0 text-priority-high" />
      <p className="min-w-0 text-[14px] leading-relaxed text-ink">
        <span className="font-semibold">{AI_PAUSED_TITLE}.</span> {what} This month&rsquo;s AI allowance is used up.{" "}
        {admin ? (
          <Link href="/workspace/billing/plans" className="font-semibold text-signal-ink underline decoration-signal-line underline-offset-4 hover:decoration-signal">
            Buy credits or upgrade
          </Link>
        ) : (
          "Your workspace admin can turn it back on."
        )}
      </p>
    </div>
  );
}
