"use client";

import { useState } from "react";
import Link from "next/link";
import { Books, UsersThree } from "@phosphor-icons/react";
import { dismissContextFill } from "@/app/actions/context-fills";
import { contextFillHeadline, type ContextFill } from "@/lib/realtime/contextFills";
import { citationLink } from "@/lib/realtime/suggestions";
import { useRoomNames } from "@/lib/realtime/room-names";

/* Context the agent found for THIS participant when the conversation referred to something they
   were missing (Phase P10, plan 3.5). From a teammate's agent or from their own knowledge base,
   always with its sources. Private: nobody else in the meeting sees it. Dismiss only hides it;
   nothing is committed or told to anyone. The card reserves its height so the panel does not
   jump when it lands. */

export type ContextFillOutcome = "dismissed" | "gone";

export function ContextFillCard({
  fill,
  currentMeetingId,
  leaving,
  onResolved,
  onError,
}: {
  fill: ContextFill;
  /** Citations without a meeting of their own point at this meeting. */
  currentMeetingId: string;
  leaving: boolean;
  /** `gone`: dismissed elsewhere or no longer exists; drop it without a feed entry. */
  onResolved: (outcome: ContextFillOutcome) => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const names = useRoomNames();
  const headline = contextFillHeadline(fill, (id) => names[id]?.name || null);
  const Icon = fill.hop === "rag" ? Books : UsersThree;

  const dismiss = async () => {
    setBusy(true);
    const res = await dismissContextFill(fill.id);
    setBusy(false);
    if (res.ok) return onResolved("dismissed");
    onError(res.message);
    if (res.gone) onResolved("gone");
  };

  return (
    <div className={`nfy-card is-context is-p3${leaving ? " is-leaving" : ""}`} aria-live="polite">
      <div className="nfy-kind">
        Shared context <span className="nfy-meta">only you</span>
      </div>
      <p className="nfy-from">
        <Icon size={12} weight="bold" aria-hidden />
        {headline}
      </p>
      <p className="nfy-text">{fill.content}</p>
      {fill.rationale ? <p className="nfy-sub">{fill.rationale}</p> : null}
      {fill.citations.length > 0 ? (
        <div className="nfy-cites">
          {fill.citations.map((c, i) => {
            const { label, href } = citationLink(c, currentMeetingId);
            return href ? (
              <Link key={i} href={href} target="_blank" rel="noopener" className="cite-chip tap">
                {label}
              </Link>
            ) : (
              <span key={i} className="cite-chip">
                {label}
              </span>
            );
          })}
        </div>
      ) : null}
      <div className="nfy-acts">
        <button type="button" className="nfy-act is-quiet tap" disabled={busy} onClick={() => void dismiss()}>
          {busy ? "Dismissing..." : "Dismiss"}
        </button>
      </div>
    </div>
  );
}
