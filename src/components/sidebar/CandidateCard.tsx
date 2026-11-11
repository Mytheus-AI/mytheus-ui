"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowsClockwise, CheckCircle, CheckSquare, EyeSlash, PencilSimple, Scales, Trash } from "@phosphor-icons/react";
import { confirmCandidate, dismissCandidate, editCandidate } from "@/app/actions/candidates";
import { checkAcceptedAction } from "@/app/actions/promises";
import type { Candidate, Settlement } from "@/lib/realtime/candidates";
import { useRoomName } from "@/lib/realtime/room-names";

/* One decision or action the agent heard, waiting for a person: the meeting's shared ledger
   (polish program, Phase 0). Everyone in the meeting sees the same card, and what one person does
   to it reaches everyone within a second:

   - Confirm is the only button that commits anything: core-api stores it and tells the rest of the
     system (Plan 7-9 section 3.8, ADR-0031). Then the room sees "Confirmed by Maya".
   - Edit rewrites the draft for everyone. While you edit, the card is locked for the others
     ("Raj is editing"), so two people never overwrite each other.
   - Hide for me takes it off your screen only. Nobody else is told and nothing is saved or
     deleted. The host (or the meeting's creator) can instead Dismiss for everyone, after one
     confirming click, and the room sees who did. */

const dueFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function dueLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : `due ${dueFormat.format(d)}`;
}

/** Renew the edit lock this often while the editor is open (the gateway's lock lasts 90 s). */
const LOCK_RENEW_MS = 30_000;

export type CandidateRoomAck = { ok: boolean; error?: string; holder?: unknown };

export function CandidateCard({
  candidate,
  asPart = false,
  moment,
  leaving,
  meId,
  canDismissForEveryone,
  lockedBy,
  onConfirmed,
  onEdited,
  onDismissedForEveryone,
  onHide,
  onGone,
  onLock,
  onNotice,
}: {
  candidate: Candidate;
  /** Drawn as one linked row of a moment card (MomentCard), without a card of its own. */
  asPart?: boolean;
  /** The quote, speaker and time line, drawn under the kind on a stand-alone card. */
  moment?: ReactNode;
  leaving: boolean;
  /** Your internal user id. */
  meId: string | null;
  /** You host or created the meeting. */
  canDismissForEveryone: boolean;
  /** Someone else is editing this card right now (their internal user id). */
  lockedBy: string | null;
  /** core-api confirmed it; `by` is who core-api says confirmed it. */
  onConfirmed: (by: string | null) => void;
  /** core-api accepted the edit. */
  onEdited: (patch: Partial<Pick<Candidate, "content" | "rationale" | "dueDate">>) => void;
  onDismissedForEveryone: () => void;
  onHide: () => void;
  /** Someone else settled it or it no longer exists: drop it quietly. */
  onGone: () => void;
  onLock: (locked: boolean) => Promise<CandidateRoomAck>;
  onNotice: (message: string, tone: "error" | "info") => void;
}) {
  const nameOf = useRoomName();
  const [busy, setBusy] = useState<null | "confirm" | "dismiss" | "save" | "edit">(null);
  const [editing, setEditing] = useState(false);
  const [askDismiss, setAskDismiss] = useState(false);
  const [text, setText] = useState(candidate.content);
  const [detail, setDetail] = useState(candidate.kind === "decision" ? (candidate.rationale ?? "") : (candidate.dueDate ?? ""));
  const isDecision = candidate.kind === "decision";
  const noun = isDecision ? "decision" : "task";
  const locked = Boolean(lockedBy) && !editing;
  const editorName = lockedBy ? nameOf(lockedBy, "Someone") : null;
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;
  const editButton = useRef<HTMLButtonElement>(null);

  // While the editor is open, keep the lock; release it when the editor closes or the card goes.
  useEffect(() => {
    if (!editing) return;
    const id = window.setInterval(() => void onLockRef.current(true), LOCK_RENEW_MS);
    return () => {
      window.clearInterval(id);
      void onLockRef.current(false);
    };
  }, [editing]);

  // Someone else's edit landed while yours was closed: show their text.
  useEffect(() => {
    if (editing) return;
    setText(candidate.content);
    setDetail(isDecision ? (candidate.rationale ?? "") : (candidate.dueDate ?? ""));
  }, [candidate.content, candidate.rationale, candidate.dueDate, editing, isDecision]);

  const confirm = async () => {
    setBusy("confirm");
    const res = await confirmCandidate(candidate.kind, candidate.id);
    setBusy(null);
    if (!res.ok) {
      onNotice(res.message, "error");
      if (res.gone) onGone();
      return;
    }
    const by = (res.row as { confirmed_by?: string | null }).confirmed_by ?? null;
    if (by && meId && by !== meId) onNotice(`${nameOf(by, "Someone")} already confirmed this ${noun}.`, "info");
    onConfirmed(by);
    // Promise ledger: a task you just took on, checked against your week (yours only, quietly).
    if (candidate.kind === "action" && (!by || by === meId)) {
      void checkAcceptedAction(candidate.id, null).then((r) => {
        if (r.ok && r.check) onNotice(`${r.check.message} Your promise ledger can offer it for you.`, "info");
      });
    }
  };

  const dismissForEveryone = async () => {
    setBusy("dismiss");
    const res = await dismissCandidate(candidate.kind, candidate.id);
    setBusy(null);
    setAskDismiss(false);
    if (!res.ok) {
      onNotice(res.message, "error");
      if (res.gone) onGone();
      return;
    }
    onDismissedForEveryone();
  };

  const startEdit = async () => {
    setBusy("edit");
    const ack = await onLock(true);
    setBusy(null);
    // Not connected to the room: edit anyway (core-api still refuses a settled card); a refusal
    // because someone else holds it is respected.
    if (!ack.ok && ack.error === "LOCKED") {
      const holder = typeof ack.holder === "string" ? nameOf(ack.holder, "Someone") : "Someone";
      onNotice(`${holder} is editing this ${noun}. Try again when they are done.`, "info");
      return;
    }
    setEditing(true);
  };

  const closeEditor = () => {
    setEditing(false);
    window.setTimeout(() => editButton.current?.focus(), 0);
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
      onNotice(res.message, "error");
      if (res.gone) onGone();
      return;
    }
    onEdited(
      isDecision
        ? { content: res.row.content, rationale: res.row.rationale ?? null }
        : { content: res.row.content, dueDate: res.row.due_date ?? null },
    );
    closeEditor();
  };

  const owner = !isDecision && candidate.assigneeId ? nameOf(candidate.assigneeId, "Someone") : null;
  const sub = isDecision
    ? candidate.rationale || undefined
    : [owner, dueLabel(candidate.dueDate)].filter(Boolean).join(", ") || undefined;
  const label = asPart ? (isDecision ? "Decision" : "Task") : isDecision ? "Decision detected" : "Action item";
  const KindIcon = isDecision ? Scales : CheckSquare;
  const editedBy = candidate.editedBy
    ? candidate.editedBy.userId === meId
      ? "Edited by you"
      : `Edited by ${nameOf(candidate.editedBy.userId, "someone")}`
    : null;
  const disabled = busy !== null || locked;

  return (
    <div
      className={
        asPart
          ? `mc-part-body is-${isDecision ? "decision" : "action"}${locked ? " is-locked" : ""}`
          : `nfy-card is-${isDecision ? "decision" : "action"} is-p3${leaving ? " is-leaving" : ""}${locked ? " is-locked" : ""}${candidate.updatedAt ? " is-updated" : ""}`
      }
      aria-busy={busy !== null || undefined}
    >
      <div className={asPart ? "mc-part-kind" : "nfy-kind"}>
        <KindIcon size={asPart ? 14 : 16} weight="bold" aria-hidden />
        {label}
        {asPart ? null : candidate.updatedAt ? <UpdatedMark /> : null}
        {asPart ? null : <span className="nfy-meta is-medium">Not saved yet</span>}
      </div>
      {asPart ? null : moment}

      {editing ? (
        <form
          className="nfy-edit"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              closeEditor();
            }
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
          <p className="nfy-lock-note">Others see that you are editing this card until you save or cancel.</p>
          <div className="nfy-acts">
            <button type="submit" className="nfy-act tap" disabled={busy !== null || !text.trim()}>
              {busy === "save" ? "Saving..." : "Save for everyone"}
            </button>
            <button type="button" className="nfy-act is-quiet tap" disabled={busy !== null} onClick={closeEditor}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="nfy-text">{candidate.content}</p>
          {sub ? <p className="nfy-sub">{sub}</p> : null}
          {locked ? (
            <p className="nfy-lock" role="status">
              <PencilSimple size={14} weight="bold" aria-hidden />
              {editorName} is editing this
            </p>
          ) : editedBy ? (
            <p className="nfy-by">{editedBy}</p>
          ) : null}
          {askDismiss ? (
            <div className="nfy-confirm" role="group" aria-label={`Dismiss this ${noun} for everyone?`}>
              <p>Dismiss for everyone? It leaves every screen and is not saved.</p>
              <div className="nfy-acts">
                <button type="button" className="nfy-act is-danger tap" disabled={busy !== null} onClick={() => void dismissForEveryone()} autoFocus>
                  {busy === "dismiss" ? "Dismissing..." : "Dismiss for everyone"}
                </button>
                <button type="button" className="nfy-act is-quiet tap" disabled={busy !== null} onClick={() => setAskDismiss(false)}>
                  Keep it
                </button>
              </div>
            </div>
          ) : (
            <div className="nfy-acts">
              <button type="button" className="nfy-act tap" disabled={disabled} onClick={() => void confirm()}>
                {busy === "confirm" ? "Confirming..." : "Confirm"}
              </button>
              <button
                ref={editButton}
                type="button"
                className="nfy-act is-quiet tap"
                disabled={disabled}
                onClick={() => void startEdit()}
              >
                Edit
              </button>
              <button
                type="button"
                className="nfy-act is-quiet tap"
                disabled={busy !== null}
                onClick={onHide}
                title="Takes this card off your screen only. Others still see it."
              >
                <EyeSlash size={14} aria-hidden />
                Hide for me
              </button>
              {canDismissForEveryone ? (
                <button type="button" className="nfy-act is-quiet tap" disabled={disabled} onClick={() => setAskDismiss(true)}>
                  <Trash size={14} aria-hidden />
                  Dismiss
                </button>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** The agent changed this card in place (an update, never a second card). */
export function UpdatedMark() {
  return (
    <span className="mc-updated" title="Your agent updated this card from what was said next">
      <ArrowsClockwise size={12} weight="bold" aria-hidden />
      Updated
    </span>
  );
}

/* A card someone just settled, in place for a moment before it folds into Activity:
   "Confirmed by Maya", "Dismissed by Priya". */
export function SettledCard({ settlement, meId }: { settlement: Settlement; meId: string | null }) {
  const nameOf = useRoomName();
  const who = settlement.byUserId && settlement.byUserId === meId ? "you" : nameOf(settlement.byUserId, "someone");
  const confirmed = settlement.outcome === "confirmed";
  const noun = settlement.kind === "decision" ? "Decision" : "Task";
  return (
    <div className={`nfy-card is-settled${confirmed ? " is-confirmed" : " is-dismissed"}`} role="status">
      <div className="nfy-kind">
        {confirmed ? <CheckCircle size={16} weight="fill" aria-hidden /> : <Trash size={16} aria-hidden />}
        {confirmed ? `${noun} confirmed by ${who}` : `${noun} dismissed by ${who}`}
      </div>
      <p className="nfy-text">{settlement.content}</p>
      {confirmed ? (
        <p className="nfy-sub">{settlement.kind === "decision" ? "Saved for the team." : "Added to the owner's tasks."}</p>
      ) : null}
    </div>
  );
}
