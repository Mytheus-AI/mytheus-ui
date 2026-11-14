"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, Sparkle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { confirmMyteProposal } from "@/app/actions/myte-threads";
import { notifyError, notifySuccess } from "@/lib/toast";
import { browserTimeZone } from "@/lib/timezone";
import type { Proposal } from "@/lib/ask-myte/reducer";
import type { AttendanceChoice, ProposalEvent } from "@/lib/ask-myte/types";

/* A Myte proposal (ADR-0047 D4): a dashed card that saves nothing until Confirm. Confirm calls the
   same write the rest of the app uses for its kind (`confirmMyteProposal`); Edit changes the
   wording, the date, or for attendance who goes and what the Myte carries; Not now sets it aside
   (and can be undone). No silent writes. */

const dueWords = (due: string | null | undefined): string | null => {
  if (!due || !/^\d{4}-\d{2}-\d{2}/.test(due)) return null;
  const d = new Date(`${due.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(d);
};

export function proposalSummary(p: Pick<ProposalEvent, "kind" | "title" | "due_date" | "choice">): string {
  const due = dueWords(p.due_date);
  const tail = due ? `, due ${due}` : "";
  switch (p.kind) {
    case "task":
      return `Add a task: "${p.title}"${tail}`;
    case "promise":
      return `Add a promise: "${p.title}"${tail}`;
    case "agenda_item":
      return `Add to the agenda: "${p.title}"`;
    case "attendance":
      return p.choice === "attend" ? `Attend yourself: ${p.title}` : p.choice === "skip" ? `Skip: ${p.title}` : `Send your Myte instead: ${p.title}`;
    default:
      return p.title;
  }
}

const CONFIRM_LABEL: Record<ProposalEvent["kind"], string> = {
  task: "Add task",
  promise: "Add promise",
  agenda_item: "Add to agenda",
  attendance: "Confirm",
};

export function ProposalCard({
  proposal,
  onSettled,
}: {
  proposal: Proposal;
  /** confirmed (with what was saved) or set aside, or brought back */
  onSettled: (status: Proposal["status"], edits?: Partial<ProposalEvent>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ label: string; href: string | null } | null>(null);
  const [title, setTitle] = useState(proposal.title);
  const [due, setDue] = useState(proposal.due_date?.slice(0, 10) ?? "");
  const [note, setNote] = useState(proposal.note ?? "");
  const [choice, setChoice] = useState<AttendanceChoice>(proposal.choice ?? "agent");
  const id = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const hasDate = proposal.kind === "task" || proposal.kind === "promise";

  const confirm = async () => {
    setBusy(true);
    setError(null);
    const edits = { title: title.trim(), due_date: hasDate ? due || null : undefined, note: note.trim() || null, choice };
    const res = await confirmMyteProposal(proposal, edits, browserTimeZone());
    setBusy(false);
    if (!res.ok) {
      setError(res.message);
      notifyError(res.message);
      return;
    }
    setEditing(false);
    setDone({ label: res.done, href: res.href });
    notifySuccess(res.done);
    onSettled("confirmed", { title: edits.title, due_date: hasDate ? edits.due_date ?? null : proposal.due_date, choice, note: edits.note });
  };

  if (proposal.status === "confirmed") {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-card border border-line bg-ok-soft px-4 py-3 text-[14px]" role="status">
        <Check size={16} weight="bold" aria-hidden className="text-ok" />
        <span className="min-w-0 flex-1 text-ink-2">
          <span className="font-semibold text-ink">{done?.label ?? "Done"}.</span> {proposalSummary(proposal)}
        </span>
        {done?.href ? (
          <Link href={done.href} className="font-semibold text-signal-ink underline-offset-4 hover:underline">
            Open
          </Link>
        ) : null}
      </div>
    );
  }

  if (proposal.status === "dismissed") {
    return (
      <div className="flex items-center gap-3 rounded-card border border-dashed border-line-2 px-4 py-2.5 text-[14px] text-ink-3">
        <span className="flex-1">Set aside: {proposalSummary(proposal)}</span>
        <Button size="sm" variant="ghost" onClick={() => onSettled("open")}>
          Show again
        </Button>
      </div>
    );
  }

  return (
    <section aria-labelledby={`${id}-k`} className="rounded-card border-[1.5px] border-dashed border-signal-line bg-surface p-4 sm:p-5">
      <p id={`${id}-k`} className="flex items-center gap-1.5 text-[13px] font-semibold text-signal-ink">
        <Sparkle size={14} weight="fill" aria-hidden />
        Myte suggests
      </p>
      {editing ? (
        <form
          className="mt-3 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void confirm();
          }}
        >
          <div>
            <label htmlFor={`${id}-t`} className="mb-1 block text-[13px] font-semibold text-ink-3">
              {proposal.kind === "attendance" ? "Meeting" : "Title"}
            </label>
            <input
              id={`${id}-t`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={500}
              disabled={proposal.kind === "attendance"}
              className="h-11 w-full rounded-ctl border border-line-2 bg-surface px-3 text-[15px] text-ink disabled:bg-surface-2 disabled:text-ink-3"
            />
          </div>
          {hasDate ? (
            <div>
              <label htmlFor={`${id}-d`} className="mb-1 block text-[13px] font-semibold text-ink-3">
                Due date
              </label>
              <input
                id={`${id}-d`}
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="h-11 rounded-ctl border border-line-2 bg-surface px-3 text-[15px] text-ink"
              />
            </div>
          ) : null}
          {proposal.kind === "attendance" ? (
            <>
              <div>
                <span id={`${id}-c`} className="mb-1 block text-[13px] font-semibold text-ink-3">
                  Who goes
                </span>
                <Dropdown
                  label="Who goes"
                  value={choice}
                  onChange={(v) => setChoice(v as AttendanceChoice)}
                  options={[
                    { value: "agent", label: "Send my Myte" },
                    { value: "attend", label: "I'll attend myself" },
                  ]}
                />
              </div>
              {choice === "agent" ? (
                <div>
                  <label htmlFor={`${id}-n`} className="mb-1 block text-[13px] font-semibold text-ink-3">
                    What your Myte should say for you
                  </label>
                  <textarea
                    id={`${id}-n`}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    className="w-full rounded-ctl border border-line-2 bg-surface px-3 py-2 text-[15px] text-ink"
                  />
                </div>
              ) : null}
            </>
          ) : null}
          {error ? (
            <p className="text-[14px] text-priority-high" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={busy || !title.trim()}>
              {busy ? "Saving" : CONFIRM_LABEL[proposal.kind]}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className="mt-1.5 text-[15.5px] leading-snug text-ink">{proposalSummary({ ...proposal, title, due_date: due || proposal.due_date, choice })}</p>
          {proposal.kind === "attendance" && note ? <p className="mt-1 text-[14px] text-ink-3">It will say: {note}</p> : null}
          {error ? (
            <p className="mt-2 text-[14px] text-priority-high" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button ref={confirmRef} size="sm" onClick={() => void confirm()} disabled={busy}>
              {busy ? "Saving" : "Confirm"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={busy}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onSettled("dismissed")} disabled={busy}>
              Not now
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
