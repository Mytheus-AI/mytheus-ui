"use client";

import { useCallback, useRef, useState } from "react";
import { setCommitmentStatus } from "@/app/actions/commitments";
import type { CommitmentStatus, PromiseView } from "@/lib/api/personal-types";
import type { UndoNotice } from "./UndoBar";

/* The promise list as the person changes it. Every change is optimistic: the row moves at once,
   the server action runs, and a refusal puts it back where it was with the reason. A successful
   done or dismiss offers Undo, which is the same change back to the previous status. A promise
   the server says no longer exists is dropped rather than restored. */

const VERB: Record<CommitmentStatus, string> = { done: "Marked done", dismissed: "Dismissed", open: "Moved back to open" };

export function usePromises(initial: PromiseView[]) {
  const [items, setItems] = useState<PromiseView[]>(initial);
  const [pending, setPending] = useState<Record<string, true>>({});
  const [notice, setNotice] = useState<UndoNotice | null>(null);
  const seq = useRef(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const patch = (id: string, next: Partial<PromiseView> | null) =>
    setItems((list) =>
      next === null ? list.filter((p) => p.id !== id) : list.map((p) => (p.id === id ? { ...p, ...next } : p)),
    );

  const change = useCallback(async (id: string, next: CommitmentStatus, isUndo = false) => {
    const before = itemsRef.current.find((p) => p.id === id);
    if (!before || before.status === next) return;
    const now = new Date().toISOString();
    patch(id, { status: next, done_at: next === "done" ? now : null, updated_at: now });
    setPending((p) => ({ ...p, [id]: true }));
    const res = await setCommitmentStatus(id, next);
    setPending((p) => {
      const copy = { ...p };
      delete copy[id];
      return copy;
    });
    if (!res.ok) {
      patch(id, res.gone ? null : { status: before.status, done_at: before.done_at, updated_at: before.updated_at });
      setNotice({ kind: "error", key: ++seq.current, text: res.message });
      return;
    }
    if (isUndo) {
      setNotice(null);
      return;
    }
    setNotice({
      kind: "undo",
      key: ++seq.current,
      text: `${VERB[next]}: ${before.content.length > 60 ? `${before.content.slice(0, 59).trimEnd()}…` : before.content}`,
      onUndo: () => void change(id, before.status, true),
    });
  }, []);

  const closeNotice = useCallback(() => setNotice(null), []);

  return { items, pending, notice, change, closeNotice };
}
