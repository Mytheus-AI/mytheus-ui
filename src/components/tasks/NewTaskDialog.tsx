"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { X } from "@phosphor-icons/react";
import { createTask } from "@/app/actions/tasks";
import { Button } from "@/components/ui/Button";
import { MemberPicker, type MemberOption } from "@/components/ui/MemberPicker";
import { FieldMsg, fieldClass } from "@/components/ui/Form";
import { Note } from "@/components/ui/Note";
import { notifySuccess } from "@/lib/toast";

/* New task: a title (required), an optional due date and an optional assignee (you by default,
   the server's default too; anyone in the workspace through the member picker). A modal dialog: focus moves to the title on open, Tab stays inside, Escape or
   the scrim closes, and focus returns to whatever opened it.

   Creating a task by hand needs `POST /api/v1/actions`, which the backend is adding. Until the
   gateway has it the action answers `notConnected`, and the dialog says so plainly instead of
   failing silently; the same dialog lights up when the endpoint exists. */
export function NewTaskDialog({
  open,
  onClose,
  onCreated,
  members = null,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  /** Workspace members for the assignee picker; null hides it (the task is then yours). */
  members?: readonly MemberOption[] | null;
}) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const [content, setContent] = useState("");
  const [due, setDue] = useState("");
  const me = members?.find((m) => m.isYou)?.id ?? null;
  const [assignee, setAssignee] = useState<string | null>(me);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ message: string; field?: "content" | "due_date" } | null>(null);
  const [notConnected, setNotConnected] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const el = document.activeElement;
    opener.current = el instanceof HTMLElement && el !== document.body ? el : null;
    setContent("");
    setDue("");
    setAssignee(me);
    setError(null);
    setNotConnected(false);
    const t = window.setTimeout(() => input.current?.focus(), 30);
    return () => {
      window.clearTimeout(t);
      if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
    };
    // `me` is stable for the dialog's life; only reopening resets the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const close = () => {
    if (!saving) onClose();
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    // The member picker handles its own Escape (closing its list) and marks it handled.
    if (e.key === "Escape" && !e.defaultPrevented) {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== "Tab" || !panel.current) return;
    const items = Array.from(panel.current.querySelectorAll<HTMLElement>("input, button:not([disabled])"));
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!content.trim()) {
      setError({ message: "Give the task a title.", field: "content" });
      input.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    const forOther = assignee && assignee !== me ? members?.find((m) => m.id === assignee) ?? null : null;
    const res = await createTask({ content, dueDate: due || null, assigneeId: forOther ? forOther.id : null });
    setSaving(false);
    if (res.ok) {
      notifySuccess(forOther ? `Task created for ${forOther.name}` : "Task created", {
        description: forOther ? `${content.trim()}. It is on their task list, not yours.` : content.trim(),
      });
      onCreated();
      onClose();
      return;
    }
    if (res.notConnected) {
      setNotConnected(true);
      return;
    }
    setError({ message: res.message, field: res.field });
  };

  const contentErr = error?.field === "content" ? error.message : null;
  const dueErr = error?.field === "due_date" ? error.message : null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-start justify-items-center overflow-y-auto px-4 pt-[8vh] sm:pt-[14vh]" onKeyDown={onKey}>
      <button type="button" tabIndex={-1} aria-label="Close" onClick={close} className="fixed inset-0 bg-[rgba(26,22,18,0.45)] backdrop-blur-[2px]" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="mx-pop relative w-full max-w-[520px] rounded-hero border border-line bg-surface p-5 shadow-warm-3 sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="display text-[22px] text-ink-display">
              New task
            </h2>
            <p className="mt-1 text-[14px] text-ink-3">It sits with the tasks from meetings, on the list of whoever owns it.</p>
          </div>
          <Button variant="ghost" size="sm" icon onClick={close} aria-label="Close new task">
            <X size={16} aria-hidden />
          </Button>
        </div>

        {notConnected ? (
          <div className="mt-5">
            <Note tone="info">
              Creating tasks by hand is not connected yet. Tasks still arrive from your meetings once someone confirms them;
              this form starts working as soon as the workspace supports it.
            </Note>
            <div className="mt-5 flex justify-end">
              <Button variant="outline" onClick={close}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 flex flex-col gap-4" noValidate>
            <div>
              <label htmlFor={`${uid}-content`} className="mb-1.5 block text-[14px] font-semibold text-ink">
                What needs doing
              </label>
              <input
                ref={input}
                id={`${uid}-content`}
                value={content}
                maxLength={500}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (contentErr) setError(null);
                }}
                placeholder="Send Raj the revised budget"
                aria-invalid={contentErr ? true : undefined}
                aria-describedby={contentErr ? `${uid}-content-msg` : undefined}
                className={fieldClass}
              />
              <FieldMsg id={`${uid}-content-msg`} error={contentErr} />
            </div>
            <div>
              <label htmlFor={`${uid}-due`} className="mb-1.5 block text-[14px] font-semibold text-ink">
                Due date <span className="font-normal text-ink-3">(optional)</span>
              </label>
              <input
                id={`${uid}-due`}
                type="date"
                value={due}
                onChange={(e) => {
                  setDue(e.target.value);
                  if (dueErr) setError(null);
                }}
                aria-invalid={dueErr ? true : undefined}
                aria-describedby={dueErr ? `${uid}-due-msg` : undefined}
                className={`${fieldClass} sm:max-w-[240px]`}
              />
              <FieldMsg id={`${uid}-due-msg`} error={dueErr} />
            </div>
            {members && members.length > 1 ? (
              <div>
                <span id={`${uid}-owner-label`} className="mb-1.5 block text-[14px] font-semibold text-ink">
                  Owner <span className="font-normal text-ink-3">(optional)</span>
                </span>
                <MemberPicker
                  id={`${uid}-owner`}
                  members={members}
                  value={assignee}
                  onChange={(id) => setAssignee(id ?? me)}
                  label="Task owner"
                  describedBy={`${uid}-owner-help`}
                  placeholder="You"
                />
                <p id={`${uid}-owner-help`} className="mt-1.5 text-[12.5px] text-ink-3">
                  You by default. Someone else gets it on their own task list.
                </p>
              </div>
            ) : null}
            {error && !error.field ? <FieldMsg id={`${uid}-msg`} error={error.message} /> : null}
            <div className="mt-1 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} aria-busy={saving}>
                {saving ? "Creating task" : "Create task"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
