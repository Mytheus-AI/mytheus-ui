"use client";

import { useState } from "react";
import Link from "next/link";
import { askSuggestion, dismissSuggestion, saveSuggestion } from "@/app/actions/suggestions";
import { citationLink, type Suggestion } from "@/lib/realtime/suggestions";

/* One question the agent suggests THIS participant asks (Plan 7-9 section 3.10, ADR-0034). It is
   private: nobody else in the meeting sees it. Ask copies the question for the chat and marks it
   asked; Save keeps it for the next meeting; Dismiss throws it away. None of them commits or
   tells anyone anything. A saved card (in Saved for later) offers Ask and Dismiss only. */

const PRIORITY_LABEL: Record<Suggestion["priority"], string> = { 1: "act now", 2: "attention", 3: "info" };

export type SuggestionOutcome = "asked" | "dismissed" | "saved" | "gone";

export function SuggestionCard({
  suggestion,
  currentMeetingId,
  leaving,
  onResolved,
  onError,
}: {
  suggestion: Suggestion;
  /** Citations without a meeting of their own point at the meeting the suggestion came from. */
  currentMeetingId: string;
  leaving: boolean;
  /** `gone`: settled elsewhere or no longer exists; drop it without a feed entry. */
  onResolved: (outcome: SuggestionOutcome) => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState<null | "ask" | "dismiss" | "save">(null);
  const saved = suggestion.status === "saved";
  const fromEarlier = saved && suggestion.meetingId && suggestion.meetingId !== currentMeetingId;

  const run = async (verb: "ask" | "dismiss" | "save") => {
    setBusy(verb);
    if (verb === "ask") {
      // Copy first, while the click still counts as a user gesture for the clipboard.
      navigator.clipboard?.writeText(suggestion.question).catch(() => undefined);
    }
    const res =
      verb === "ask"
        ? await askSuggestion(suggestion.id)
        : verb === "save"
          ? await saveSuggestion(suggestion.id)
          : await dismissSuggestion(suggestion.id);
    setBusy(null);
    if (res.ok) return onResolved(verb === "ask" ? "asked" : verb === "save" ? "saved" : "dismissed");
    onError(res.message);
    if (res.gone) onResolved("gone");
  };

  const meta = saved ? (fromEarlier ? "saved, earlier meeting" : "saved") : PRIORITY_LABEL[suggestion.priority];
  const sourceMeeting = suggestion.meetingId ?? currentMeetingId;

  return (
    <div
      className={`nfy-card is-question is-p${saved ? 3 : suggestion.priority}${leaving ? " is-leaving" : ""}`}
      role={!saved && suggestion.priority === 1 ? "alert" : undefined}
    >
      <div className="nfy-kind">
        Suggested question <span className="nfy-meta">{meta}</span>
      </div>
      <p className="nfy-text">{suggestion.question}</p>
      {suggestion.rationale ? <p className="nfy-sub">{suggestion.rationale}</p> : null}
      {suggestion.citations.length > 0 ? (
        <div className="nfy-cites">
          {suggestion.citations.map((c, i) => {
            const { label, href } = citationLink(c, sourceMeeting);
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
        <button type="button" className="nfy-act tap" disabled={busy !== null} onClick={() => void run("ask")}>
          {busy === "ask" ? "Asking..." : "Ask"}
        </button>
        {saved ? null : (
          <button type="button" className="nfy-act is-quiet tap" disabled={busy !== null} onClick={() => void run("save")}>
            {busy === "save" ? "Saving..." : "Save for later"}
          </button>
        )}
        <button type="button" className="nfy-act is-quiet tap" disabled={busy !== null} onClick={() => void run("dismiss")}>
          {busy === "dismiss" ? "Dismissing..." : "Dismiss"}
        </button>
      </div>
    </div>
  );
}
