"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowCounterClockwise,
  ArrowSquareOut,
  CalendarPlus,
  CheckCircle,
  EyeSlash,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react";
import { bookRevisit, readRevisitSlot, reconfirmAssumption, reopenDecision } from "@/app/actions/decision-why";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Dialog } from "@/components/ui/Dialog";
import { CharCount, FieldMsg, textareaClass } from "@/components/ui/Form";
import type { Assumption, DecisionWhy } from "@/lib/api/why-blast-types";
import { KIND_LABEL, LIMITS, brokenTitle, checkNote, dayLabel, evidenceSource } from "@/lib/decision-why";
import { notifyError, notifySuccess } from "@/lib/toast";
import { Said } from "./AssumptionRow";
import { SlotDialog } from "./SlotDialog";

/* The hero moment: a reason this decision rested on is no longer true. The old words and the new
   evidence sit side by side (stacked on a phone), with where the evidence came from and the
   agent's one-line reason. Evidence from a meeting the viewer was not in is never quoted.

   The owner decides, the agent only proposes: Re-confirm (with a short note on why it still
   stands), Reopen the decision (task owners are then asked keep, re-scope or close), or Book a
   15-minute revisit at the time the agent found for everyone. */

export function BrokenAssumption({
  a,
  why,
  lit,
  onAssumption,
  onWhy,
  onReread,
}: {
  a: Assumption;
  why: DecisionWhy;
  lit: boolean;
  onAssumption: (a: Assumption) => void;
  onWhy: (w: DecisionWhy) => void;
  onReread: () => void;
}) {
  const router = useRouter();
  const uid = useId();
  const e = a.open_break;
  const [mode, setMode] = useState<"idle" | "reconfirm">("idle");
  const [note, setNote] = useState("");
  const [noteErr, setNoteErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenNote, setReopenNote] = useState("");
  const [revisitOpen, setRevisitOpen] = useState(false);
  const reconfirmBtn = useRef<HTMLButtonElement>(null);
  if (!e) return null;

  const src = evidenceSource(e);
  const headId = `${uid}-h`;

  const reconfirm = async (ev: FormEvent) => {
    ev.preventDefault();
    const check = checkNote(note);
    if (!check.ok) {
      setNoteErr(check.message);
      return;
    }
    setBusy(true);
    const res = await reconfirmAssumption(a.id, check.note);
    setBusy(false);
    if (!res.ok) {
      setNoteErr(res.message);
      if (res.code === "gone" || res.code === "conflict") onReread();
      return;
    }
    notifySuccess("Decision re-confirmed", { description: "Your Myte keeps watching this reason." });
    onAssumption(res.data);
  };

  const reopen = async () => {
    setBusy(true);
    const res = await reopenDecision(a.id, reopenNote);
    setBusy(false);
    if (!res.ok) {
      notifyError(res.message);
      setReopenOpen(false);
      if (res.code === "gone" || res.code === "conflict") onReread();
      return;
    }
    setReopenOpen(false);
    notifySuccess("Decision reopened", { description: "Task owners are asked to keep, re-scope or close their tasks." });
    onWhy(res.data);
    router.refresh();
  };

  return (
    <article
      id={`assumption-${a.id}`}
      tabIndex={-1}
      aria-labelledby={headId}
      className={`scroll-mt-24 rounded-card border bg-surface px-4 py-[18px] outline-none transition-[box-shadow] duration-200 ease-[var(--ease-out)] focus-visible:shadow-[0_0_0_2px_var(--signal)] motion-reduce:transition-none sm:px-[22px] ${
        lit ? "shadow-[0_0_0_2px_var(--signal),0_0_0_7px_var(--signal-soft)]" : "shadow-warm-1"
      } border-[color:color-mix(in_srgb,var(--priority-medium)_40%,var(--line))]`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="medium" icon={<WarningCircle size={14} weight="fill" />}>
          No longer true
        </Chip>
        <Chip tone="neutral">{KIND_LABEL[a.kind]}</Chip>
        {e.created_at ? <span className="text-[13px] text-ink-3">Noticed {dayLabel(e.created_at)}</span> : null}
      </div>
      <h3 id={headId} className="display mt-3 text-[22px] leading-tight text-ink-display">
        {brokenTitle(why.content)}
      </h3>
      <p className="mt-1.5 max-w-[68ch] text-[15px] leading-snug text-ink-2">{a.statement}</p>

      <div className="mt-5 grid gap-3 md:grid-cols-2 md:gap-0">
        <section aria-label="When you decided" className="rounded-ctl bg-bg-2 px-4 py-3.5 md:rounded-r-none">
          <p className="text-[13px] font-semibold text-ink-3">When you decided</p>
          {a.quote ? (
            <Said quote={a.quote} by={a.stated_by} className="mt-2" />
          ) : (
            <p className="mt-2 text-[15px] leading-snug text-ink-2">{a.statement}</p>
          )}
        </section>
        <section
          aria-label="What changed"
          className="rounded-ctl border border-[color:color-mix(in_srgb,var(--priority-medium)_35%,var(--line))] bg-surface px-4 py-3.5 md:rounded-l-none md:border-l-0"
        >
          <p className="text-[13px] font-semibold text-priority-medium">Now</p>
          {e.redacted ? (
            <p className="mt-2 flex items-start gap-2 text-[15px] leading-snug text-ink-2">
              <EyeSlash size={17} aria-hidden className="mt-0.5 shrink-0 text-ink-3" />
              Said in a meeting you were not in. Its words stay with the people who were there.
            </p>
          ) : e.quote ? (
            <Said quote={e.quote} by={e.speaker} className="mt-2" />
          ) : (
            <p className="mt-2 text-[15px] leading-snug text-ink-2">{e.rationale}</p>
          )}
          {!e.redacted ? (
            <p className="mt-2.5 text-[13px] text-ink-3">
              {src.href ? (
                src.external ? (
                  <a href={src.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-ink-2 underline decoration-line-2 underline-offset-4 hover:decoration-signal">
                    {src.text}
                    <ArrowSquareOut size={12} aria-hidden />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <Link href={src.href} className="font-semibold text-ink-2 underline decoration-line-2 underline-offset-4 hover:decoration-signal">
                    {src.text}
                  </Link>
                )
              ) : (
                src.text
              )}
            </p>
          ) : null}
        </section>
      </div>

      {e.rationale && (e.quote || e.redacted) ? (
        <p className="mt-4 flex max-w-[72ch] items-start gap-2 text-[14px] leading-relaxed text-ink-2">
          <Sparkle size={16} aria-hidden className="mt-0.5 shrink-0 text-signal" />
          <span>
            <span className="font-semibold text-ink">Your Myte: </span>
            {e.rationale}
          </span>
        </p>
      ) : null}

      {why.can_edit ? (
        mode === "reconfirm" ? (
          <form onSubmit={reconfirm} className="mt-5 max-w-[640px]" noValidate>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={`${uid}-note`} className="text-[14px] font-semibold text-ink">
                Why does the decision still stand?
              </label>
              <CharCount n={note.trim().length} max={LIMITS.note} />
            </div>
            <textarea
              id={`${uid}-note`}
              rows={2}
              autoFocus
              value={note}
              onChange={(ev) => {
                setNote(ev.target.value);
                setNoteErr(null);
              }}
              onKeyDown={(ev) => {
                if (ev.key === "Escape" && !busy) {
                  ev.preventDefault();
                  setMode("idle");
                  setTimeout(() => reconfirmBtn.current?.focus(), 0);
                }
              }}
              placeholder="Acme agreed to hold the old price for us until March."
              aria-invalid={Boolean(noteErr)}
              aria-describedby={`${uid}-note-msg`}
              className={`${textareaClass} mt-2`}
            />
            <FieldMsg id={`${uid}-note-msg`} error={noteErr} hint="The note stays with the decision, so anyone reading it later knows why." />
            <div className="mt-3 flex flex-wrap gap-2.5">
              <Button type="submit" size="sm" disabled={busy} aria-busy={busy}>
                <CheckCircle size={15} aria-hidden />
                {busy ? "Re-confirming" : "Re-confirm decision"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setMode("idle");
                  setTimeout(() => reconfirmBtn.current?.focus(), 0);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button type="button" size="sm" onClick={() => setRevisitOpen(true)}>
              <CalendarPlus size={15} aria-hidden />
              Book a 15-minute revisit
            </Button>
            <Button ref={reconfirmBtn} type="button" size="sm" variant="outline" onClick={() => setMode("reconfirm")}>
              <CheckCircle size={15} aria-hidden />
              Re-confirm
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setReopenOpen(true)}>
              <ArrowCounterClockwise size={15} aria-hidden />
              Reopen decision
            </Button>
          </div>
        )
      ) : (
        <p className="mt-5 text-[14px] text-ink-3">
          {why.owner ? `${why.owner.name} owns this decision` : "The decision's owner"} and decides whether it still stands. They have been told.
        </p>
      )}

      <Dialog
        open={reopenOpen}
        onClose={() => setReopenOpen(false)}
        busy={busy}
        title="Reopen this decision?"
        description="It goes back to open. Everyone who owns a task from this decision's meeting is asked to keep, re-scope or close it. Nothing is closed for them."
      >
        <label htmlFor={`${uid}-reopen`} className="text-[14px] font-semibold text-ink">
          A note for them <span className="font-normal text-ink-3">(optional)</span>
        </label>
        <textarea
          id={`${uid}-reopen`}
          rows={2}
          maxLength={LIMITS.note}
          value={reopenNote}
          onChange={(ev) => setReopenNote(ev.target.value)}
          placeholder="Acme raised the price, so we are looking at vendors again."
          className={`${textareaClass} mt-2`}
        />
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Button type="button" onClick={() => void reopen()} disabled={busy} aria-busy={busy}>
            <ArrowCounterClockwise size={16} aria-hidden />
            {busy ? "Reopening" : "Reopen decision"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setReopenOpen(false)} disabled={busy}>
            Keep it as it is
          </Button>
        </div>
      </Dialog>

      <SlotDialog
        open={revisitOpen}
        onClose={() => setRevisitOpen(false)}
        title="Book a 15-minute revisit"
        description="Your Myte found the first time this week that suits everyone behind the decision, with the broken reason as the one agenda item."
        loadSlot={() => readRevisitSlot(a.id)}
        book={(start) => bookRevisit(a.id, start)}
        bookLabel="Book revisit"
        onBooked={(m) => {
          notifySuccess("Revisit booked", {
            description: m.title,
            undo: () => router.push(`/meetings/${m.meeting_id}`),
            undoLabel: "Open meeting",
          });
          onReread();
        }}
      />
    </article>
  );
}
