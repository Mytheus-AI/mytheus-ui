"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, CheckCircle, Crown, Handshake, Scales, X } from "@phosphor-icons/react";
import {
  acceptSettleProposal,
  bookSettleMeeting,
  declineSettleProposal,
  keepBothDecisions,
  readSettleSlot,
  readSettlement,
  supersedeDecision,
} from "@/app/actions/settlements";
import { SlotDialog } from "@/components/decision-why/SlotDialog";
import { Button } from "@/components/ui/Button";
import { CardHead, cardClass } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { CharCount, FieldMsg, textareaClass } from "@/components/ui/Form";
import type { Settlement } from "@/lib/api/why-blast-types";
import { dayLabel } from "@/lib/decision-why";
import { SETTLE_LIMITS, checkKeepNote, outcomeLine, ownerName, proposalLine } from "@/lib/settlements";
import { notifyError, notifySuccess } from "@/lib/toast";

/* The three ways to settle a clash, side by side with the thread:
   - Keep both, with a note on why both can stand;
   - One supersedes the other: if yours wins it is only a proposal the other owner accepts or
     declines; if theirs wins it applies at once, after a confirm, since your decision is replaced
     and its tasks go to their owners (keep, re-scope or close);
   - Meet: 15 minutes for the two of you at the time the agent found.
   A settled thread reads as its outcome instead. */

export function SettleOutcomes({ settlement: s, onChange }: { settlement: Settlement; onChange: (s: Settlement) => void }) {
  const router = useRouter();
  const uid = useId();
  const [busy, setBusy] = useState<string | null>(null);
  const [keepOpen, setKeepOpen] = useState(false);
  const [note, setNote] = useState("");
  const [noteErr, setNoteErr] = useState<string | null>(null);
  const [winner, setWinner] = useState<"mine" | "theirs" | null>(null);
  const [confirmLose, setConfirmLose] = useState<"supersede" | "accept" | null>(null);
  const [slotOpen, setSlotOpen] = useState(false);
  const them = ownerName(s.theirs);
  const Them = them.charAt(0).toUpperCase() + them.slice(1);

  const run = async (key: string, fn: () => Promise<{ ok: true; data: Settlement } | { ok: false; message: string }>, done: string, description?: string) => {
    setBusy(key);
    const res = await fn();
    setBusy(null);
    if (!res.ok) {
      notifyError(res.message);
      return false;
    }
    onChange(res.data);
    notifySuccess(done, { description });
    router.refresh();
    return true;
  };

  if (s.status !== "open") {
    const r = s.resolution;
    return (
      <section aria-labelledby={`${uid}-h`} className={cardClass()}>
        <p className="flex items-center gap-2 text-[13px] font-semibold text-ok">
          <CheckCircle size={16} weight="fill" aria-hidden />
          Settled{r?.at ? ` ${dayLabel(r.at)}` : ""}
        </p>
        <h2 id={`${uid}-h`} className="display mt-2 text-[22px] leading-tight text-ink-display">
          {s.status === "kept_both" ? "Both decisions stand" : s.status === "meeting_booked" ? "You are meeting about it" : "One decision stands"}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{outcomeLine(s)}</p>
        {r?.note ? <p className="mt-2 font-display text-[16px] italic leading-snug text-ink-2">&ldquo;{r.note}&rdquo;</p> : null}
        {s.status === "meeting_booked" && r?.meeting_id ? (
          <Link
            href={`/meetings/${r.meeting_id}`}
            className="mt-3 inline-flex min-h-[40px] items-center gap-1.5 text-[14px] font-semibold text-signal-ink underline-offset-4 hover:underline"
          >
            <CalendarPlus size={15} aria-hidden />
            Open the meeting
          </Link>
        ) : null}
      </section>
    );
  }

  const proposal = proposalLine(s);
  const theirProposal = s.proposal && !s.proposal.by_me ? s.proposal : null;
  const mineLosesOnAccept = theirProposal ? theirProposal.winner_decision_id !== s.mine.decision_id : false;

  const keep = async (e: FormEvent) => {
    e.preventDefault();
    const check = checkKeepNote(note);
    if (!check.ok) {
      setNoteErr(check.message);
      return;
    }
    const ok = await run("keep", () => keepBothDecisions(s.id, check.note), "Both decisions kept");
    if (ok) setKeepOpen(false);
  };

  const supersede = async () => {
    if (!winner) return;
    const winnerId = winner === "mine" ? s.mine.decision_id : s.theirs.decision_id;
    const ok = await run(
      "supersede",
      () => supersedeDecision(s.id, winnerId),
      winner === "mine" ? "Proposal sent" : "Their decision stands",
      winner === "mine" ? `${Them} can accept or decline it.` : "Your decision's tasks were sent to their owners to keep, re-scope or close.",
    );
    if (ok) {
      setWinner(null);
      setConfirmLose(null);
    }
  };

  const accept = async () => {
    const ok = await run("accept", () => acceptSettleProposal(s.id), "Proposal accepted");
    if (ok) setConfirmLose(null);
  };

  return (
    <section aria-labelledby={`${uid}-h`} className={cardClass({ flush: true })}>
      <CardHead id={`${uid}-h`} title="Settle it" description="Pick one of three. The other owner sees what you chose." divided />

      {proposal ? (
        <div role="status" className="border-b border-line bg-priority-low-soft px-4 py-4 sm:px-[22px]">
          <p className="flex items-start gap-2 text-[15px] leading-snug text-ink">
            <Crown size={17} aria-hidden className="mt-0.5 shrink-0 text-priority-low" />
            {proposal}
          </p>
          {theirProposal ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy !== null}
                aria-busy={busy === "accept"}
                onClick={() => (mineLosesOnAccept ? setConfirmLose("accept") : void accept())}
              >
                <CheckCircle size={15} aria-hidden />
                {busy === "accept" ? "Accepting" : "Accept"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy !== null}
                aria-busy={busy === "decline"}
                onClick={() => void run("decline", () => declineSettleProposal(s.id), "Proposal declined", "The thread is open again.")}
              >
                <X size={15} aria-hidden />
                {busy === "decline" ? "Declining" : "Decline"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <ol className="divide-y divide-line">
        <li className="px-4 py-4 sm:px-[22px]">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <Handshake size={17} aria-hidden className="text-ink-3" />
            Keep both
          </h3>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-3">They can stand together. Say why, for anyone who reads them later.</p>
          {keepOpen ? (
            <form onSubmit={keep} className="mt-3" noValidate>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={`${uid}-note`} className="text-[14px] font-semibold text-ink">
                  Why both can stand
                </label>
                <CharCount n={note.trim().length} max={SETTLE_LIMITS.note} />
              </div>
              <textarea
                id={`${uid}-note`}
                rows={2}
                autoFocus
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setNoteErr(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setKeepOpen(false);
                  }
                }}
                placeholder="Sales' discount is for renewals only, so it doesn't touch new pricing."
                aria-invalid={Boolean(noteErr)}
                aria-describedby={`${uid}-note-msg`}
                className={`${textareaClass} mt-2`}
              />
              <FieldMsg id={`${uid}-note-msg`} error={noteErr} />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="submit" size="sm" disabled={busy !== null} aria-busy={busy === "keep"}>
                  {busy === "keep" ? "Keeping" : "Keep both decisions"}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setKeepOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => setKeepOpen(true)} disabled={busy !== null}>
              Keep both
            </Button>
          )}
        </li>

        {!s.proposal ? (
          <li className="px-4 py-4 sm:px-[22px]">
            <h3 id={`${uid}-sup`} className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <Scales size={17} aria-hidden className="text-ink-3" />
              One supersedes the other
            </h3>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-3">Choose which decision stands. The other one is replaced, and its tasks go to their owners.</p>
            <div role="radiogroup" aria-labelledby={`${uid}-sup`} className="mt-3 grid gap-2">
              {(
                [
                  { v: "mine", title: "Mine stands", help: `${Them} has to accept before anything changes.` },
                  { v: "theirs", title: `${Them}'s stands`, help: "Applies as soon as you confirm. Yours is replaced." },
                ] as const
              ).map((o) => {
                const on = winner === o.v;
                return (
                  <button
                    key={o.v}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setWinner(o.v)}
                    onKeyDown={(e) => {
                      if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) {
                        e.preventDefault();
                        const next = o.v === "mine" ? "theirs" : "mine";
                        setWinner(next);
                        (e.currentTarget.parentElement?.querySelector(`[data-v="${next}"]`) as HTMLElement | null)?.focus();
                      }
                    }}
                    data-v={o.v}
                    tabIndex={winner === o.v || (winner === null && o.v === "mine") ? 0 : -1}
                    className={`flex items-start gap-3 rounded-ctl border px-3.5 py-3 text-left transition-colors duration-150 ${
                      on ? "border-signal bg-signal-soft" : "border-line-2 bg-surface hover:bg-surface-2"
                    }`}
                  >
                    <span aria-hidden className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${on ? "border-signal" : "border-ink-4"}`}>
                      {on ? <span className="h-2 w-2 rounded-full bg-signal" /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14.5px] font-semibold text-ink">{o.title}</span>
                      <span className="block text-[13.5px] leading-snug text-ink-3">{o.help}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              disabled={!winner || busy !== null}
              aria-busy={busy === "supersede"}
              onClick={() => (winner === "theirs" ? setConfirmLose("supersede") : void supersede())}
            >
              {busy === "supersede" ? "Sending" : winner === "theirs" ? `Let ${them}'s stand` : "Propose mine stands"}
            </Button>
          </li>
        ) : null}

        <li className="px-4 py-4 sm:px-[22px]">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <CalendarPlus size={17} aria-hidden className="text-ink-3" />
            Meet
          </h3>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-3">Fifteen minutes for the two of you, at the first time that suits both.</p>
          <Button type="button" size="sm" className="mt-3" onClick={() => setSlotOpen(true)} disabled={busy !== null}>
            <CalendarPlus size={15} aria-hidden />
            Find a time
          </Button>
        </li>
      </ol>

      <Dialog
        open={confirmLose !== null}
        onClose={() => setConfirmLose(null)}
        busy={busy !== null}
        title={`Let ${them}'s decision stand?`}
        description="Yours is superseded right away. Everyone with a task from it is asked to keep, re-scope or close that task."
      >
        <div className="flex flex-wrap gap-2.5">
          <Button
            type="button"
            onClick={() => void (confirmLose === "accept" ? accept() : supersede())}
            disabled={busy !== null}
            aria-busy={busy !== null}
          >
            {busy ? "Applying" : confirmLose === "accept" ? "Accept, theirs stands" : "Yes, theirs stands"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setConfirmLose(null)} disabled={busy !== null}>
            Keep talking
          </Button>
        </div>
      </Dialog>

      <SlotDialog
        open={slotOpen}
        onClose={() => setSlotOpen(false)}
        title="Meet to settle it"
        description={`Your Myte found the first 15 minutes that suit you and ${them}, with the clash as the one agenda item.`}
        loadSlot={() => readSettleSlot(s.id)}
        book={(start) => bookSettleMeeting(s.id, start)}
        bookLabel="Book meeting"
        onBooked={(m) => {
          notifySuccess("Meeting booked", {
            description: m.title,
            undo: () => router.push(`/meetings/${m.meeting_id}`),
            undoLabel: "Open meeting",
          });
          void readSettlement(s.id).then((r) =>
            onChange(
              r.ok
                ? r.data
                : { ...s, status: "meeting_booked", resolution: { by: null, at: new Date().toISOString(), note: null, winner_decision_id: null, meeting_id: m.meeting_id } },
            ),
          );
        }}
      />
    </section>
  );
}
