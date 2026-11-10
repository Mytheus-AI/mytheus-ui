"use client";

import { useCallback, useState } from "react";
import { answerStatusRequest } from "@/app/actions/status-requests";
import { composeStatusText, type QuickPick, type StatusRequestView } from "@/lib/api/personal-types";
import { notifySuccess } from "@/lib/toast";

/* Pending requests and their drafts. Sending is optimistic: the request moves to Answered at
   once with the text it will carry, and an "Update sent" toast confirms it (a sent answer cannot
   be taken back, so there is no Undo); a refusal moves it back with the draft intact and the
   reason beside it. A request the server says is gone (already answered, expired) is dropped. */

export interface Draft {
  pick: QuickPick | null;
  note: string;
}

const EMPTY: Draft = { pick: null, note: "" };

export function useStatusAnswers(pending: StatusRequestView[], answered: StatusRequestView[] = []) {
  const [open, setOpen] = useState(pending);
  const [done, setDone] = useState(answered);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, true>>({});
  const [sentCount, setSentCount] = useState(0);

  const draftOf = (id: string) => drafts[id] ?? EMPTY;

  const setDraft = useCallback((id: string, next: Partial<Draft>) => {
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? EMPTY), ...next } }));
    setErrors((e) => {
      if (!e[id]) return e;
      const copy = { ...e };
      delete copy[id];
      return copy;
    });
  }, []);

  const submit = useCallback(
    async (req: StatusRequestView) => {
      const d = drafts[req.id] ?? EMPTY;
      const text = composeStatusText(d.pick, d.note);
      if (!text) {
        setErrors((e) => ({ ...e, [req.id]: "Pick a status or write a line first." }));
        return;
      }
      const optimistic: StatusRequestView = { ...req, state: "answered", status_text: text, answered_at: new Date().toISOString() };
      setSaving((s) => ({ ...s, [req.id]: true }));
      setOpen((list) => list.filter((r) => r.id !== req.id));
      setDone((list) => [optimistic, ...list]);
      const res = await answerStatusRequest(req.id, text);
      setSaving((s) => {
        const copy = { ...s };
        delete copy[req.id];
        return copy;
      });
      if (res.ok) {
        setDone((list) => list.map((r) => (r.id === req.id ? { ...r, answered_at: res.answeredAt } : r)));
        setSentCount((n) => n + 1);
        notifySuccess("Update sent", { description: req.actionTitle });
        return;
      }
      setDone((list) => list.filter((r) => r.id !== req.id));
      if (res.gone) return;
      setOpen((list) => (list.some((r) => r.id === req.id) ? list : [req, ...list]));
      setErrors((e) => ({ ...e, [req.id]: res.message }));
    },
    [drafts],
  );

  return { open, done, draftOf, setDraft, submit, errors, saving, sentCount };
}
