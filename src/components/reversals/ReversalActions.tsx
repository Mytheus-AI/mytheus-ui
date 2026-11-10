"use client";

import { useId, useRef, useState } from "react";
import { ArrowCounterClockwise, Check, CheckCircle, PencilSimpleLine, XCircle } from "@phosphor-icons/react";
import { resolveDecisionReversal } from "@/app/actions/decision-reversals";
import { markAlertRead } from "@/app/actions/notifications";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { CharCount, FieldMsg, fieldClass, textareaClass } from "@/components/ui/Form";
import type { DecisionReversal, ReversalResolution, ReversalStatus } from "@/lib/api/only-mytheus-types";
import { dayMonth } from "@/lib/digest";
import { RESCOPE_LIMITS, RESOLUTION_COPY, checkRescope, resolutionOf } from "@/lib/reversals";
import { graceful, notifyError, notifyInfo, notifySuccess } from "@/lib/toast";

/* Keep, re-scope or close a task whose decision changed (only-Mytheus wave, contract section 1).
   One component for the Inbox row and the tasks page banner.

   Keep and Close are one click: the outcome shows at once and the write waits out the toast's
   grace period, so Undo simply never sends it (as for marking a task done). Re-scope opens a small
   editor in place for the task's wording and due date and saves straight away. Once settled, the
   row says what happened; a reversal settled elsewhere shows the server's outcome instead. */

type Task = { content: string; due_date: string | null };

export function ReversalActions({
  reversalId,
  status: initialStatus,
  task,
  notificationId,
  label,
  onSettled,
  onServerSettled,
}: {
  reversalId: string;
  status: ReversalStatus;
  /** The task as it is now, for the re-scope editor; null when it could not be read. */
  task: Task | null;
  /** The Inbox notification this came from: marked read once the task is settled. */
  notificationId?: string;
  /** Names the group for screen readers, e.g. the task's wording. */
  label?: string;
  onSettled?: (status: ReversalStatus) => void;
  /** After the server has the outcome (not during the Undo grace period): refresh what depends on it. */
  onServerSettled?: () => void;
}) {
  const uid = useId();
  const [status, setStatus] = useState<ReversalStatus>(initialStatus);
  const [current, setCurrent] = useState<Task | null>(task);
  const [gone, setGone] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ content: task?.content ?? "", dueDate: task?.due_date ?? "" });
  const [error, setError] = useState<{ field: "content" | "due_date" | "form"; message: string } | null>(null);
  const rescopeButton = useRef<HTMLButtonElement>(null);

  const settle = (next: ReversalStatus) => {
    setStatus(next);
    onSettled?.(next);
  };

  const afterServer = (res: Awaited<ReturnType<typeof resolveDecisionReversal>>, wanted: ReversalResolution) => {
    if (res.ok) {
      setCurrent({ content: res.reversal.action.content, due_date: res.reversal.action.due_date });
      settle(res.reversal.status);
      if (notificationId) void markAlertRead(notificationId);
      onServerSettled?.();
      return true;
    }
    if (res.current) {
      // Settled elsewhere (another tab, the other screen): show what actually happened.
      const actual = res.current.status;
      setCurrent({ content: res.current.action.content, due_date: res.current.action.due_date });
      settle(actual);
      const was = resolutionOf(actual);
      if (was && was !== wanted) notifyInfo("This was already settled", { description: RESOLUTION_COPY[was].outcome });
      onServerSettled?.();
      return true;
    }
    if (res.gone) {
      setGone(true);
      return true;
    }
    return false;
  };

  const oneClick = (resolution: "keep" | "close") => {
    const before = status;
    graceful({
      message: RESOLUTION_COPY[resolution].toast,
      apply: () => settle(resolution === "keep" ? "kept" : "closed"),
      revert: () => settle(before),
      commit: async () => {
        const res = await resolveDecisionReversal(reversalId, resolution);
        if (afterServer(res, resolution)) return { ok: true };
        return { ok: false, message: res.ok ? "" : res.message };
      },
    });
  };

  const openEditor = () => {
    setDraft({ content: current?.content ?? "", dueDate: current?.due_date ?? "" });
    setError(null);
    setEditing(true);
    window.requestAnimationFrame(() => document.getElementById(`${uid}-task`)?.focus());
  };

  const closeEditor = () => {
    setEditing(false);
    setError(null);
    window.requestAnimationFrame(() => rescopeButton.current?.focus());
  };

  const saveRescope = async () => {
    const checked = checkRescope(draft, current ?? { content: "", due_date: null });
    if (!checked.ok) {
      setError({ field: checked.field, message: checked.message });
      if (checked.field !== "form") document.getElementById(`${uid}-${checked.field === "content" ? "task" : "due"}`)?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    const res = await resolveDecisionReversal(reversalId, "rescope", {
      content: checked.body.content,
      due_date: checked.body.due_date,
    });
    setBusy(false);
    if (afterServer(res, "rescope")) {
      setEditing(false);
      if (res.ok) notifySuccess(RESOLUTION_COPY.rescope.toast);
      return;
    }
    if (!res.ok) {
      if (res.field) setError({ field: res.field, message: res.message });
      else notifyError(res.message, { retry: () => void saveRescope() });
    }
  };

  const resolution = resolutionOf(status);
  const groupLabel = label ? `What to do with this task: ${label}` : "What to do with this task";

  if (gone) {
    return (
      <p className="mt-3 text-[14px] text-ink-3" role="status">
        This change is no longer here. The task may have been removed.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <div aria-live="polite">
        {resolution ? (
          <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
            <Chip tone={resolution === "close" ? "neutral" : "ok"} icon={<CheckCircle size={14} weight="fill" />}>
              {resolution === "keep" ? "Task kept" : resolution === "rescope" ? "Task re-scoped" : "Task closed"}
            </Chip>
            <p className="min-w-0 flex-[1_1_16rem] text-[14px] leading-relaxed text-ink-3">
              {RESOLUTION_COPY[resolution].outcome}
              {resolution === "rescope" && current ? (
                <>
                  {" "}
                  <span className="text-ink-2">Now: {current.content}</span>
                  {current.due_date ? <span className="text-ink-2">, due {dayMonth(current.due_date)}</span> : null}
                </>
              ) : null}
            </p>
          </div>
        ) : null}
      </div>

      {!resolution && !editing ? (
        <div role="group" aria-label={groupLabel} className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => oneClick("keep")}>
            <Check size={15} weight="bold" aria-hidden />
            {RESOLUTION_COPY.keep.button}
          </Button>
          <Button
            ref={rescopeButton}
            size="sm"
            variant="outline"
            aria-expanded={false}
            aria-controls={`${uid}-editor`}
            onClick={openEditor}
          >
            <PencilSimpleLine size={15} aria-hidden />
            {RESOLUTION_COPY.rescope.button}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => oneClick("close")}>
            <XCircle size={15} aria-hidden />
            {RESOLUTION_COPY.close.button}
          </Button>
        </div>
      ) : null}

      {!resolution && editing ? (
        <form
          id={`${uid}-editor`}
          noValidate
          aria-label="Re-scope the task"
          className="rounded-ctl border border-line bg-surface-2 p-3.5 sm:p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void saveRescope();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              closeEditor();
            }
          }}
        >
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px] md:gap-4">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <label htmlFor={`${uid}-task`} className="text-[14px] font-semibold text-ink">
                  The task, for the new decision
                </label>
                <CharCount n={draft.content.length} max={RESCOPE_LIMITS.contentMax} />
              </div>
              <textarea
                id={`${uid}-task`}
                rows={2}
                value={draft.content}
                maxLength={RESCOPE_LIMITS.contentMax + 200}
                disabled={busy}
                aria-invalid={error?.field === "content" ? true : undefined}
                aria-describedby={error?.field === "content" ? `${uid}-task-msg` : undefined}
                onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void saveRescope();
                  }
                }}
                className={textareaClass}
              />
              <FieldMsg id={`${uid}-task-msg`} error={error?.field === "content" ? error.message : null} />
            </div>
            <div className="min-w-0">
              <label htmlFor={`${uid}-due`} className="mb-1.5 block text-[14px] font-semibold text-ink">
                Due date <span className="font-normal text-ink-3">(optional)</span>
              </label>
              <input
                id={`${uid}-due`}
                type="date"
                value={draft.dueDate}
                disabled={busy}
                aria-invalid={error?.field === "due_date" ? true : undefined}
                aria-describedby={error?.field === "due_date" ? `${uid}-due-msg` : undefined}
                onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
                className={fieldClass}
              />
              <FieldMsg id={`${uid}-due-msg`} error={error?.field === "due_date" ? error.message : null} />
            </div>
          </div>
          {error?.field === "form" ? <FieldMsg id={`${uid}-form-msg`} error={error.message} /> : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" disabled={busy} aria-busy={busy}>
              <Check size={15} weight="bold" aria-hidden />
              {busy ? "Saving" : "Save re-scope"}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={closeEditor}>
              <ArrowCounterClockwise size={15} aria-hidden />
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

/** The task part of a reversal, for `ReversalActions`. */
export function taskOf(r: DecisionReversal | null | undefined): Task | null {
  return r ? { content: r.action.content, due_date: r.action.due_date } : null;
}
