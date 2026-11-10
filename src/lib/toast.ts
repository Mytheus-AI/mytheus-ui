"use client";

import { toast } from "sonner";

/* One toast system for the whole app (outside the call room, which keeps its own).

   - Success messages reuse the verb of the button that caused them: "Confirm decision" answers
     "Decision confirmed", "Save name" answers "Name saved".
   - Where an action can be undone, the toast offers Undo.
   - `graceful` is for actions the server cannot take back (completing a task, confirming a card,
     marking a notification read): the screen shows the result at once, the write waits out a short
     grace period, and Undo inside it simply never sends the write. `undoLast` lets a keyboard
     shortcut (z) undo the most recent one. Pending writes are sent at once if the page unloads. */

const DEFAULT_GRACE_MS = 5000;

type Pending = { id: string | number; timer: ReturnType<typeof setTimeout>; commit: () => void; undo: () => void };
const pending: Pending[] = [];

function remove(p: Pending) {
  const i = pending.indexOf(p);
  if (i >= 0) pending.splice(i, 1);
}

let unloadHooked = false;
function hookUnload() {
  if (unloadHooked || typeof window === "undefined") return;
  unloadHooked = true;
  window.addEventListener("pagehide", () => {
    for (const p of [...pending]) {
      clearTimeout(p.timer);
      remove(p);
      p.commit();
    }
  });
}

/** "Name saved." Optionally with Undo (for actions that can be reversed after the fact). */
export function notifySuccess(message: string, opts: { description?: string; undo?: () => void; undoLabel?: string } = {}) {
  return toast.success(message, {
    description: opts.description,
    action: opts.undo ? { label: opts.undoLabel ?? "Undo", onClick: () => opts.undo?.() } : undefined,
    duration: opts.undo ? 6000 : 4000,
  });
}

/** A failed action, in plain words, with Retry when it makes sense. Stays longer than a success. */
export function notifyError(message: string, opts: { description?: string; retry?: () => void } = {}) {
  return toast.error(message, {
    description: opts.description,
    action: opts.retry ? { label: "Retry", onClick: () => opts.retry?.() } : undefined,
    duration: 8000,
  });
}

export function notifyInfo(message: string, opts: { description?: string } = {}) {
  return toast.info(message, { description: opts.description, duration: 4000 });
}

/**
 * Show the result now, send the write after a grace period, and let Undo cancel it.
 *
 * `apply` runs at once (the optimistic change). `commit` runs after `graceMs` unless undone; if it
 * fails, `revert` runs and the failure is shown. `revert` also runs on Undo.
 */
export function graceful({
  message,
  apply,
  revert,
  commit,
  graceMs = DEFAULT_GRACE_MS,
}: {
  message: string;
  apply?: () => void;
  revert: () => void;
  commit: () => Promise<{ ok: true } | { ok: false; message: string; gone?: boolean }>;
  graceMs?: number;
}) {
  hookUnload();
  apply?.();
  const send = () => {
    void commit().then((res) => {
      if (!res.ok && !res.gone) {
        revert();
        notifyError(res.message);
      }
    });
  };
  const undo = () => {
    clearTimeout(entry.timer);
    remove(entry);
    toast.dismiss(entry.id);
    revert();
  };
  const entry: Pending = {
    id: "",
    timer: setTimeout(() => {
      remove(entry);
      send();
    }, graceMs),
    commit: send,
    undo,
  };
  entry.id = toast.success(message, {
    action: { label: "Undo", onClick: () => undo() },
    duration: graceMs,
  });
  pending.push(entry);
  return { undo };
}

/** Undo the most recent action still inside its grace period. True when there was one. */
export function undoLast(): boolean {
  const last = pending[pending.length - 1];
  if (!last) return false;
  last.undo();
  return true;
}
