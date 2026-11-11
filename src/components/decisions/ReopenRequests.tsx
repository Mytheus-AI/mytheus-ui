"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowRight, ArrowsCounterClockwise, CalendarPlus, Check, CheckSquare, X, XCircle } from "@phosphor-icons/react";
import { acceptReopen, askToReopen, declineReopen, withdrawReopen, type ReopenResult } from "@/app/actions/decision-challenges";
import { markAlertRead } from "@/app/actions/notifications";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Dropdown } from "@/components/ui/Dropdown";
import { CharCount, FieldMsg, fieldClass, textareaClass } from "@/components/ui/Form";
import type { ReopenOutcome, ReopenRequest } from "@/lib/api/decision-challenges-types";
import {
  OUTCOME_COPY,
  REOPEN_LIMITS,
  checkAccept,
  defaultFollowUpDue,
  defaultRevisitStart,
  localDate,
  localDateTime,
  reopenOutcomeLine,
  type AcceptDraft,
} from "@/lib/decision-challenges";
import { graceful, notifyError, notifyInfo } from "@/lib/toast";

/* Reopening a decision: the owner's answer (Accept with a revisit or a follow-up task, or
   Decline), the person who asked (Withdraw), and "Ask to reopen" for anyone else who can see the
   decision. One component set for the decision page and the Inbox row.

   Every answer shows its outcome at once and is sent after the toast's grace period, so Undo
   simply never sends it (the house pattern). A request settled elsewhere shows the server's
   outcome instead. */

const OUTCOMES: { value: ReopenOutcome; label: string; description: string; icon: JSX.Element }[] = [
  { value: "revisit", label: OUTCOME_COPY.revisit.option, description: OUTCOME_COPY.revisit.description, icon: <CalendarPlus size={16} aria-hidden /> },
  { value: "follow_up", label: OUTCOME_COPY.follow_up.option, description: OUTCOME_COPY.follow_up.description, icon: <CheckSquare size={16} aria-hidden /> },
];

/** What happened to a settled request, with a way to what it made. */
export function ReopenOutcomeLine({ request }: { request: ReopenRequest }) {
  const accepted = request.status === "accepted";
  const href =
    accepted && request.outcome === "revisit" && request.revisit_meeting_id
      ? `/meetings/${request.revisit_meeting_id}`
      : accepted && request.outcome === "follow_up" && request.follow_up_action_id
        ? `/work/tasks?focus=${request.follow_up_action_id}`
        : null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5" role="status">
      <Chip
        tone={accepted ? "ok" : request.status === "declined" ? "neutral" : "outline"}
        icon={accepted ? <Check size={13} weight="bold" /> : <XCircle size={13} />}
      >
        {accepted ? "Accepted" : request.status === "declined" ? "Declined" : "Withdrawn"}
      </Chip>
      <span className="text-[14px] text-ink-3">{reopenOutcomeLine(request)}</span>
      {href ? (
        <Link href={href} className="inline-flex items-center gap-1 rounded-ctl text-[14px] font-semibold text-ink underline-offset-4 hover:underline">
          {request.outcome === "revisit" ? "Open the meeting" : "Open the task"}
          <ArrowRight size={12} weight="bold" aria-hidden />
        </Link>
      ) : null}
      {request.response_note ? (
        <p className="w-full max-w-[75ch] text-[14px] text-ink-2">
          <span className="text-ink-3">Note from the owner: </span>
          {request.response_note}
        </p>
      ) : null}
    </div>
  );
}

/** The owner's Accept / Decline, in place. */
export function ReopenAnswer({
  request,
  notificationId,
  onChange,
}: {
  request: ReopenRequest;
  /** The Inbox notification this came from: marked read once answered. */
  notificationId?: string;
  onChange?: (next: ReopenRequest) => void;
}) {
  const uid = useId();
  const [current, setCurrent] = useState(request);
  const [mode, setMode] = useState<"idle" | "accept" | "decline">("idle");
  const [draft, setDraft] = useState<AcceptDraft>({ outcome: "revisit", when: "", due: "", note: "" });
  const [declineNote, setDeclineNote] = useState("");
  const [error, setError] = useState<{ field: "when" | "due" | "note"; message: string } | null>(null);
  const acceptBtn = useRef<HTMLButtonElement>(null);
  const [minDate, setMinDate] = useState<string | undefined>(undefined);

  useEffect(() => setCurrent(request), [request]);

  const update = (next: ReopenRequest) => {
    setCurrent(next);
    onChange?.(next);
  };

  const afterServer = (res: ReopenResult): { ok: true } | { ok: false; message: string; gone?: boolean } => {
    if (res.ok) {
      update(res.request);
      if (notificationId) void markAlertRead(notificationId);
      return { ok: true };
    }
    if (res.current) {
      update(res.current);
      notifyInfo("This request was already answered", { description: reopenOutcomeLine(res.current) });
      return { ok: true };
    }
    return { ok: false, message: res.message, gone: res.gone };
  };

  const close = () => {
    setMode("idle");
    setError(null);
    window.requestAnimationFrame(() => acceptBtn.current?.focus());
  };

  const openAccept = () => {
    const now = new Date();
    setDraft({ outcome: "revisit", when: localDateTime(defaultRevisitStart(now)), due: defaultFollowUpDue(now), note: "" });
    setMinDate(localDate(now));
    setError(null);
    setMode("accept");
    window.requestAnimationFrame(() => document.getElementById(`${uid}-outcome`)?.focus());
  };

  const openDecline = () => {
    setDeclineNote("");
    setError(null);
    setMode("decline");
    window.requestAnimationFrame(() => document.getElementById(`${uid}-decline`)?.focus());
  };

  const submitAccept = () => {
    const checked = checkAccept(draft, new Date());
    if (!checked.ok) {
      setError({ field: checked.field, message: checked.message });
      document.getElementById(`${uid}-${checked.field}`)?.focus();
      return;
    }
    const before = current;
    const outcome = draft.outcome;
    setMode("idle");
    graceful({
      message: OUTCOME_COPY[outcome].toast,
      apply: () => setCurrent({ ...before, status: "accepted", outcome, response_note: checked.body.note ?? null }),
      revert: () => setCurrent(before),
      commit: async () => afterServer(await acceptReopen(before.id, checked.body)),
    });
  };

  const submitDecline = () => {
    const note = declineNote.replace(/\s+/g, " ").trim();
    if (note.length > REOPEN_LIMITS.noteMax) {
      setError({ field: "note", message: `Keep the note to ${REOPEN_LIMITS.noteMax} characters.` });
      return;
    }
    const before = current;
    setMode("idle");
    graceful({
      message: "Request declined",
      apply: () => setCurrent({ ...before, status: "declined", response_note: note || null }),
      revert: () => setCurrent(before),
      commit: async () => afterServer(await declineReopen(before.id, note || undefined)),
    });
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
    }
  };

  if (current.status !== "pending") return <ReopenOutcomeLine request={current} />;

  const name = current.requested_by.name || "Someone";

  return (
    <div className="mt-3">
      {mode === "idle" ? (
        <div role="group" aria-label={`Answer ${name}'s request to reopen this decision`} className="flex flex-wrap items-center gap-2">
          <Button ref={acceptBtn} size="sm" onClick={openAccept}>
            <ArrowsCounterClockwise size={15} aria-hidden />
            Accept
          </Button>
          <Button size="sm" variant="ghost" onClick={openDecline}>
            <X size={15} aria-hidden />
            Decline
          </Button>
        </div>
      ) : mode === "accept" ? (
        <div
          role="group"
          aria-labelledby={`${uid}-accept-title`}
          onKeyDown={onKey}
          className="rounded-ctl border border-line bg-surface-2 p-3.5 sm:p-4"
        >
          <p id={`${uid}-accept-title`} className="text-[14px] font-semibold text-ink">
            Reopen the decision
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <label htmlFor={`${uid}-outcome`} className="mb-1.5 block text-[14px] font-semibold text-ink-2">
                What happens next
              </label>
              <Dropdown<ReopenOutcome>
                id={`${uid}-outcome`}
                label="What happens next"
                value={draft.outcome}
                onChange={(outcome) => {
                  setDraft((d) => ({ ...d, outcome }));
                  setError(null);
                }}
                options={OUTCOMES}
                size="lg"
              />
            </div>
            {draft.outcome === "revisit" ? (
              <div className="min-w-0">
                <label htmlFor={`${uid}-when`} className="mb-1.5 block text-[14px] font-semibold text-ink-2">
                  Starts
                </label>
                <input
                  id={`${uid}-when`}
                  type="datetime-local"
                  value={draft.when}
                  min={minDate ? `${minDate}T00:00` : undefined}
                  onChange={(e) => setDraft((d) => ({ ...d, when: e.target.value }))}
                  aria-invalid={error?.field === "when" || undefined}
                  aria-describedby={`${uid}-when-msg`}
                  className={fieldClass}
                />
                <FieldMsg id={`${uid}-when-msg`} error={error?.field === "when" ? error.message : null} hint="30 minutes, with you as host." />
              </div>
            ) : (
              <div className="min-w-0">
                <label htmlFor={`${uid}-due`} className="mb-1.5 block text-[14px] font-semibold text-ink-2">
                  Due
                </label>
                <input
                  id={`${uid}-due`}
                  type="date"
                  value={draft.due}
                  min={minDate}
                  onChange={(e) => setDraft((d) => ({ ...d, due: e.target.value }))}
                  aria-invalid={error?.field === "due" || undefined}
                  aria-describedby={`${uid}-due-msg`}
                  className={fieldClass}
                />
                <FieldMsg id={`${uid}-due-msg`} error={error?.field === "due" ? error.message : null} hint="The task is yours." />
              </div>
            )}
          </div>
          <div className="mt-3">
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <label htmlFor={`${uid}-note`} className="text-[14px] font-semibold text-ink-2">
                Note to {name} <span className="font-normal text-ink-3">(optional)</span>
              </label>
              <CharCount n={draft.note.length} max={REOPEN_LIMITS.noteMax} />
            </div>
            <textarea
              id={`${uid}-note`}
              rows={2}
              value={draft.note}
              maxLength={REOPEN_LIMITS.noteMax}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
              aria-invalid={error?.field === "note" || undefined}
              aria-describedby={`${uid}-note-msg`}
              className={textareaClass}
            />
            <FieldMsg id={`${uid}-note-msg`} error={error?.field === "note" ? error.message : null} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={submitAccept}>
              {draft.outcome === "revisit" ? <CalendarPlus size={15} aria-hidden /> : <CheckSquare size={15} aria-hidden />}
              {draft.outcome === "revisit" ? "Schedule revisit" : "Create task"}
            </Button>
            <Button size="sm" variant="ghost" onClick={close}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div role="group" aria-labelledby={`${uid}-decline-title`} onKeyDown={onKey} className="rounded-ctl border border-line bg-surface-2 p-3.5 sm:p-4">
          <p id={`${uid}-decline-title`} className="text-[14px] font-semibold text-ink">
            Keep the decision as it is
          </p>
          <div className="mb-1.5 mt-3 flex items-baseline justify-between gap-3">
            <label htmlFor={`${uid}-decline`} className="text-[14px] font-semibold text-ink-2">
              Tell {name} why <span className="font-normal text-ink-3">(optional)</span>
            </label>
            <CharCount n={declineNote.length} max={REOPEN_LIMITS.noteMax} />
          </div>
          <textarea
            id={`${uid}-decline`}
            rows={2}
            value={declineNote}
            maxLength={REOPEN_LIMITS.noteMax}
            onChange={(e) => setDeclineNote(e.target.value)}
            aria-invalid={error?.field === "note" || undefined}
            aria-describedby={`${uid}-decline-msg`}
            className={textareaClass}
          />
          <FieldMsg id={`${uid}-decline-msg`} error={error?.field === "note" ? error.message : null} />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={submitDecline}>
              Decline request
            </Button>
            <Button size="sm" variant="ghost" onClick={close}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** The person who asked: their request's state, and Withdraw (with Undo) while it waits. */
export function ReopenMine({ request, onChange }: { request: ReopenRequest; onChange?: (next: ReopenRequest | null) => void }) {
  const [current, setCurrent] = useState(request);
  useEffect(() => setCurrent(request), [request]);

  if (current.status !== "pending") return <ReopenOutcomeLine request={current} />;

  const withdraw = () => {
    const before = current;
    graceful({
      message: "Request withdrawn",
      apply: () => {
        const next = { ...before, status: "withdrawn" as const };
        setCurrent(next);
        onChange?.(next);
      },
      revert: () => {
        setCurrent(before);
        onChange?.(before);
      },
      commit: async () => {
        const res = await withdrawReopen(before.id, before.meeting_id, before.decision_id);
        if (res.ok) return { ok: true };
        if (res.current) {
          setCurrent(res.current);
          onChange?.(res.current);
          return { ok: true };
        }
        return { ok: false, message: res.message, gone: res.gone };
      },
    });
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <Chip tone="medium">Waiting on {current.owner?.name ?? "the owner"}</Chip>
      <Button size="sm" variant="ghost" onClick={withdraw}>
        Withdraw request
      </Button>
    </div>
  );
}

/** "Ask to reopen" for someone who can see the decision but does not own it. */
export function AskToReopen({
  decisionId,
  meetingId,
  ownerName,
  onAsked,
}: {
  decisionId: string;
  meetingId: string;
  ownerName: string | null;
  onAsked: (request: ReopenRequest) => void;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    setError(null);
    window.requestAnimationFrame(() => trigger.current?.focus());
  };

  const send = async () => {
    const clean = reason.replace(/\s+/g, " ").trim();
    if (clean.length > REOPEN_LIMITS.reasonMax) {
      setError(`Keep the reason to ${REOPEN_LIMITS.reasonMax} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    const res = await askToReopen(decisionId, meetingId, clean);
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      setReason("");
      onAsked(res.request);
      return;
    }
    if (res.field === "reason") setError(res.message);
    else notifyError(res.message, { retry: () => void send() });
  };

  if (!open) {
    return (
      <Button
        ref={trigger}
        variant="outline"
        size="sm"
        onClick={() => {
          setOpen(true);
          window.requestAnimationFrame(() => document.getElementById(`${uid}-reason`)?.focus());
        }}
      >
        <ArrowsCounterClockwise size={15} aria-hidden />
        Ask to reopen
      </Button>
    );
  }

  return (
    <div
      role="group"
      aria-labelledby={`${uid}-title`}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          close();
        }
      }}
      className="w-full rounded-ctl border border-line bg-surface-2 p-3.5 sm:p-4"
    >
      <p id={`${uid}-title`} className="text-[14px] font-semibold text-ink">
        Ask {ownerName ?? "the owner"} to reopen this decision
      </p>
      <p className="mt-0.5 text-[14px] text-ink-3">They decide whether to revisit it. Nothing changes until they do.</p>
      <div className="mb-1.5 mt-3 flex items-baseline justify-between gap-3">
        <label htmlFor={`${uid}-reason`} className="text-[14px] font-semibold text-ink-2">
          What changed <span className="font-normal text-ink-3">(optional)</span>
        </label>
        <CharCount n={reason.length} max={REOPEN_LIMITS.reasonMax} />
      </div>
      <textarea
        id={`${uid}-reason`}
        rows={3}
        value={reason}
        maxLength={REOPEN_LIMITS.reasonMax}
        onChange={(e) => setReason(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${uid}-reason-msg`}
        className={textareaClass}
      />
      <FieldMsg id={`${uid}-reason-msg`} error={error} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void send()} disabled={busy}>
          {busy ? "Sending..." : "Send request"}
        </Button>
        <Button size="sm" variant="ghost" onClick={close} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
