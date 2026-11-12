"use client";

import { useCallback, useState, type ReactNode } from "react";
import { CheckCircle, HandHeart, Lock, NotePencil, Sparkle } from "@phosphor-icons/react";
import { findMeetingPromise, setCommitmentStatus } from "@/app/actions/commitments";
import type { Candidate } from "@/lib/realtime/candidates";
import { momentHeadline, type LivePromise, type MomentCard as MomentCardModel } from "@/lib/realtime/moments";
import { UpdatedMark } from "@/components/sidebar/CandidateCard";
import { MomentLine, WhyLine, type MomentTarget } from "@/components/sidebar/MomentLine";

/* One card per moment (polish program, Phase 1). One sentence used to produce a note, a promise,
   a decision card and an action card; now everything your Mytes took from one moment is ONE
   card: the quote, who said it and when (open it in the transcript), why you are seeing it, and
   its parts as linked rows on one straight thread. Each decision and task keeps its own Confirm,
   Edit and Hide (shared with the room, exactly as a stand-alone card); your promise has Keep,
   Done and Not a promise; your note is just there to read. Confirming the task of a moment closes
   the promise you made in it: it is tracked as a task now.

   A card with one decision or task and nothing else is drawn as that card on its own, with the
   moment above its text, so the common case stays as light as it was. An update from the agent
   replaces the card in place, with a quiet "Updated" mark, never a second card. */

export type PromiseStatus = "open" | "kept" | "done" | "dismissed" | "tracked";

const PROMISE_SAID: Record<Exclude<PromiseStatus, "open">, string> = {
  kept: "Kept in your promises.",
  done: "Marked done.",
  dismissed: "Removed. It was not a promise.",
  tracked: "Tracked as a task now, so the promise is closed.",
};

/** Your promises in this room: their state here and the one call that settles each. */
export function usePromises(meetingId: string, onNotice: (message: string, tone: "error" | "info" | "success") => void) {
  const [state, setState] = useState<Record<string, PromiseStatus>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const act = useCallback(
    async (p: LivePromise, status: Exclude<PromiseStatus, "open">): Promise<boolean> => {
      setBusy((b) => ({ ...b, [p.key]: true }));
      const done = (ok: boolean) => {
        setBusy((b) => ({ ...b, [p.key]: false }));
        return ok;
      };
      // "Keep" changes nothing on the server: a promise your Myte heard is already kept.
      if (status === "kept") {
        setState((s) => ({ ...s, [p.key]: "kept" }));
        return done(true);
      }
      const found = await findMeetingPromise(meetingId, p.windowId, p.content);
      if (!found.ok) {
        if (status !== "tracked") onNotice(found.message, found.pending ? "info" : "error");
        return done(false);
      }
      const res = await setCommitmentStatus(found.id, status === "done" ? "done" : "dismissed");
      if (!res.ok) {
        if (status !== "tracked") onNotice(res.message, "error");
        return done(false);
      }
      setState((s) => ({ ...s, [p.key]: status }));
      if (status === "done") onNotice("Promise marked done", "success");
      else if (status === "dismissed") onNotice("Promise removed", "success");
      return done(true);
    },
    [meetingId, onNotice],
  );

  return { state, busy, act };
}

export type Promises = ReturnType<typeof usePromises>;

function PromiseRow({ promise, promises }: { promise: LivePromise; promises: Promises }) {
  const status = promises.state[promise.key] ?? "open";
  const busy = Boolean(promises.busy[promise.key]);
  return (
    <div className={`mc-part-body is-promise${status !== "open" ? " is-settled" : ""}`} aria-busy={busy || undefined}>
      <div className="mc-part-kind">
        <HandHeart size={14} weight="bold" aria-hidden />
        Your promise
        <span className="mc-private">
          <Lock size={11} weight="fill" aria-hidden />
          Only you
        </span>
      </div>
      <p className="nfy-text">{promise.content}</p>
      {promise.dueHint ? <p className="nfy-sub">By {promise.dueHint}</p> : null}
      {status === "open" ? (
        <div className="nfy-acts">
          <button type="button" className="nfy-act tap" disabled={busy} onClick={() => void promises.act(promise, "kept")}>
            Keep promise
          </button>
          <button type="button" className="nfy-act is-quiet tap" disabled={busy} onClick={() => void promises.act(promise, "done")}>
            Already done
          </button>
          <button type="button" className="nfy-act is-quiet tap" disabled={busy} onClick={() => void promises.act(promise, "dismissed")}>
            Not a promise
          </button>
        </div>
      ) : (
        <p className="mc-part-said" role="status">
          <CheckCircle size={14} weight="fill" aria-hidden />
          {PROMISE_SAID[status]}
        </p>
      )}
    </div>
  );
}

function NoteRow({ text }: { text: string }) {
  const lines = text
    .split("\n")
    .map((l) => l.replace(/^\s*[-*]\s+/, "").trim())
    .filter(Boolean);
  return (
    <div className="mc-part-body is-note">
      <div className="mc-part-kind">
        <NotePencil size={14} weight="bold" aria-hidden />
        Your note
        <span className="mc-private">
          <Lock size={11} weight="fill" aria-hidden />
          Only you
        </span>
      </div>
      {lines.map((l, i) => (
        <p key={i} className="mc-note-line">
          {l}
        </p>
      ))}
    </div>
  );
}

export function MomentCard({
  card,
  meId,
  leaving,
  renderCandidate,
  promises,
  onOpenMoment,
}: {
  card: MomentCardModel;
  meId: string | null;
  /** Candidate ids sliding out. */
  leaving: ReadonlySet<string>;
  /** Draws one decision or task with its shared-ledger actions (the sidebar owns those). */
  renderCandidate: (c: Candidate, opts: { asPart: boolean; moment?: ReactNode }) => ReactNode;
  promises: Promises;
  onOpenMoment?: (target: MomentTarget, opener: HTMLElement) => void;
}) {
  const momentLine = <MomentLine moment={card.moment} meId={meId} onOpen={onOpenMoment} />;
  const candidates = card.parts.filter((p): p is Extract<typeof p, { candidate: Candidate }> => "candidate" in p);

  // The common case: one decision or task, nothing else from that moment.
  if (card.parts.length === 1 && candidates.length === 1) {
    const c = candidates[0].candidate;
    return (
      <>
        {renderCandidate(c, {
          asPart: false,
          moment: (
            <>
              {momentLine}
              <WhyLine why={card.moment.why} />
            </>
          ),
        })}
      </>
    );
  }

  const headline = momentHeadline(card);
  const allLeaving = candidates.length > 0 && candidates.every((p) => leaving.has(p.candidate.id));
  const headingId = `mc-${card.key}`;
  return (
    <article className={`nfy-card is-moment${allLeaving ? " is-leaving" : ""}`} aria-labelledby={headingId}>
      <div className="nfy-kind" id={headingId}>
        <Sparkle size={16} weight="bold" aria-hidden />
        {headline}
        {card.updated ? <UpdatedMark /> : null}
        <span className="nfy-meta is-medium">{card.pending > 1 ? `${card.pending} not saved yet` : "Not saved yet"}</span>
      </div>
      {momentLine}
      <WhyLine why={card.moment.why} />
      <ol className="mc-parts" aria-label={`From this moment: ${headline.toLowerCase()}${card.parts.some((p) => p.kind === "promise") ? ", your promise" : ""}`}>
        {card.parts.map((p) => {
          const key = p.kind === "promise" ? p.promise.key : p.kind === "note" ? `note-${p.note.windowId}` : p.candidate.id;
          const out = p.kind !== "promise" && p.kind !== "note" && leaving.has(p.candidate.id);
          return (
            <li key={key} className={`mc-part is-${p.kind}${out ? " is-leaving" : ""}`}>
              {p.kind === "promise" ? (
                <PromiseRow promise={p.promise} promises={promises} />
              ) : p.kind === "note" ? (
                <NoteRow text={p.note.text} />
              ) : (
                renderCandidate(p.candidate, { asPart: true })
              )}
            </li>
          );
        })}
      </ol>
    </article>
  );
}
