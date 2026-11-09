"use client";

import { useState } from "react";
import { confirmCandidate, dismissCandidate, editCandidate } from "@/app/actions/candidates";
import type { Candidate } from "@/lib/realtime/candidates";
import { useRoomName } from "@/lib/realtime/room-names";

/* One decision or action the agent heard, waiting for a person. Confirm is the only button that
   commits anything: core-api stores it and tells the rest of the system (Plan 7-9 section 3.8,
   ADR-0031). Edit rewrites the draft first. Dismiss throws it away and tells no one. */

const dueFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function dueLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : `due ${dueFormat.format(d)}`;
}

export type CandidateOutcome = "confirmed" | "dismissed";

export function CandidateCard({
  candidate,
  leaving,
  onResolved,
  onUpdated,
  onError,
}: {
  candidate: Candidate;
  leaving: boolean;
  /** `gone`: someone else settled it or it no longer exists; drop it without a feed entry. */
  onResolved: (outcome: CandidateOutcome | "gone") => void;
  onUpdated: (patch: Partial<Pick<Candidate, "content" | "rationale" | "dueDate">>) => void;
  onError: (message: string) => void;
}) {
  const nameOf = useRoomName();
  const [busy, setBusy] = useState<null | "confirm" | "dismiss" | "save">(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(candidate.content);
  const [detail, setDetail] = useState(candidate.kind === "decision" ? (candidate.rationale ?? "") : (candidate.dueDate ?? ""));
  const isDecision = candidate.kind === "decision";

  const run = async (kind: "confirm" | "dismiss") => {
    setBusy(kind);
    const res = kind === "confirm" ? await confirmCandidate(candidate.kind, candidate.id) : await dismissCandidate(candidate.kind, candidate.id);
    setBusy(null);
    if (res.ok) return onResolved(kind === "confirm" ? "confirmed" : "dismissed");
    onError(res.message);
    if (res.gone) onResolved("gone");
  };

  const save = async () => {
    setBusy("save");
    const res = await editCandidate(
      candidate.kind,
      candidate.id,
      isDecision ? { content: text, rationale: detail } : { content: text, dueDate: detail || null },
    );
    setBusy(null);
    if (!res.ok) {
      onError(res.message);
      if (res.gone) onResolved("gone");
      return;
    }
    onUpdated(
      isDecision
        ? { content: res.row.content, rationale: res.row.rationale ?? null }
        : { content: res.row.content, dueDate: res.row.due_date ?? null },
    );
    setEditing(false);
  };

  const owner = !isDecision && candidate.assigneeId ? nameOf(candidate.assigneeId, "Someone") : null;
  const sub = isDecision
    ? candidate.rationale || undefined
    : [owner, dueLabel(candidate.dueDate)].filter(Boolean).join(", ") || undefined;
  const label = isDecision ? "Decision detected" : "Action item";

  return (
    <div className={`nfy-card is-${isDecision ? "decision" : "action"} is-p3${leaving ? " is-leaving" : ""}`}>
      <div className="nfy-kind">
        {label} <span className="nfy-meta">not saved yet</span>
      </div>

      {editing ? (
        <form
          className="nfy-edit"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <label>
            <span>{isDecision ? "Decision" : "Task"}</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000} autoFocus />
          </label>
          {isDecision ? (
            <label>
              <span>Why (optional)</span>
              <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={2} maxLength={2000} />
            </label>
          ) : (
            <label>
              <span>Due (optional)</span>
              <input type="date" value={detail} onChange={(e) => setDetail(e.target.value)} />
            </label>
          )}
          <div className="nfy-acts">
            <button type="submit" className="nfy-act tap" disabled={busy !== null || !text.trim()}>
              {busy === "save" ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className="nfy-act is-quiet tap"
              disabled={busy !== null}
              onClick={() => {
                setText(candidate.content);
                setDetail(isDecision ? (candidate.rationale ?? "") : (candidate.dueDate ?? ""));
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="nfy-text">{candidate.content}</p>
          {sub ? <p className="nfy-sub">{sub}</p> : null}
          <div className="nfy-acts">
            <button type="button" className="nfy-act tap" disabled={busy !== null} onClick={() => void run("confirm")}>
              {busy === "confirm" ? "Confirming..." : "Confirm"}
            </button>
            <button type="button" className="nfy-act is-quiet tap" disabled={busy !== null} onClick={() => setEditing(true)}>
              Edit
            </button>
            <button type="button" className="nfy-act is-quiet tap" disabled={busy !== null} onClick={() => void run("dismiss")}>
              {busy === "dismiss" ? "Dismissing..." : "Dismiss"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
