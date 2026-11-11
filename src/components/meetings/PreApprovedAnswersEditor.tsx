"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { LockSimple, Plus, X } from "@phosphor-icons/react";
import { saveDelegatedAnswers } from "@/app/actions/delegated-answers";
import { Button } from "@/components/ui/Button";
import { CharCount, FieldMsg, fieldClass } from "@/components/ui/Form";
import { addStatement, uncoveredAnswer } from "@/lib/delegated-answers";
import { notifyError, notifySuccess } from "@/lib/toast";

/* The list of statements your agent may answer from (only-Mytheus wave, contract section 2).
   Type a statement and press Enter (or Add); remove one with its X. Each change saves at once, so
   there is no Save button to forget; a failed save puts the list back and says so, with Retry.
   Read only once the meeting has started. */

type Limits = { statementsMax: number; charsMax: number };

export function PreApprovedAnswersEditor({
  meetingId,
  initial,
  editable: initialEditable,
  limits,
  personName,
}: {
  meetingId: string;
  initial: string[];
  editable: boolean;
  limits: Limits;
  /** Your name, for the line the agent says when it has no statement. */
  personName: string;
}) {
  const uid = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [list, setList] = useState<string[]>(initial);
  const [saved, setSaved] = useState<string[]>(initial);
  const [editable, setEditable] = useState(initialEditable);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const full = list.length >= limits.statementsMax;
  const fallback = uncoveredAnswer(personName);

  const save = async (next: string[], done: string) => {
    const before = saved;
    setList(next);
    setSaving(true);
    const res = await saveDelegatedAnswers(meetingId, next);
    setSaving(false);
    if (!res.ok) {
      setList(before);
      if (res.locked) setEditable(false);
      notifyError(res.message, res.locked ? {} : { retry: () => void save(next, done) });
      return false;
    }
    const stored = res.saved.statements.slice().sort((a, b) => a.position - b.position).map((s) => s.text);
    setList(stored);
    setSaved(stored);
    setEditable(res.saved.editable);
    notifySuccess(done);
    return true;
  };

  const add = async () => {
    const r = addStatement(list, text, limits);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setError(null);
    const typed = text;
    setText("");
    const ok = await save(r.list, "Answer saved");
    if (!ok) setText(typed);
    inputRef.current?.focus();
  };

  const remove = (i: number) => {
    const next = list.filter((_, j) => j !== i);
    void save(next, "Answer removed");
    // Focus moves to the next row's Remove, or to the field when the list empties.
    window.requestAnimationFrame(() => {
      const target =
        document.getElementById(`${uid}-rm-${Math.min(i, next.length - 1)}`) ?? (editable ? inputRef.current : null);
      target?.focus();
    });
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!saving) void add();
    }
  };

  return (
    <div>
      <p className="max-w-[68ch] text-[14px] leading-relaxed text-ink-3">
        Your agent answers only from these. Anything else gets: <span className="text-ink-2">&ldquo;{fallback}&rdquo;</span>
      </p>

      {list.length > 0 ? (
        <ol aria-label="Pre-approved answers" className="mt-3.5 divide-y divide-line overflow-hidden rounded-ctl border border-line">
          {list.map((s, i) => (
            <li key={`${i}-${s}`} className="flex items-start gap-3 bg-surface py-1.5 pl-3.5 pr-1.5">
              <span aria-hidden className="mt-[9px] w-5 shrink-0 text-right text-[12.5px] font-semibold tabular-nums text-ink-4">
                {i + 1}
              </span>
              <p className="min-w-0 flex-1 break-words py-2 text-[15px] leading-snug text-ink">{s}</p>
              {editable ? (
                <Button
                  id={`${uid}-rm-${i}`}
                  size="sm"
                  variant="ghost"
                  icon
                  disabled={saving}
                  aria-label={`Remove: ${s}`}
                  onClick={() => remove(i)}
                >
                  <X size={15} weight="bold" aria-hidden />
                </Button>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3.5 rounded-ctl border border-dashed border-line-2 bg-surface-2 px-3.5 py-3 text-[14px] leading-relaxed text-ink-3">
          {editable
            ? `No statements yet. Without any, your agent answers every question with the line above.`
            : "You didn't pre-approve any answers, so your agent answered every question with the line above."}
        </p>
      )}

      {editable ? (
        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label htmlFor={`${uid}-new`} className="text-[14px] font-semibold text-ink">
              Add a statement
            </label>
            <span className="text-[12.5px] tabular-nums text-ink-3">
              {list.length} of {limits.statementsMax}
            </span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <input
                ref={inputRef}
                id={`${uid}-new`}
                value={text}
                disabled={full}
                autoComplete="off"
                placeholder={full ? "Remove one to add another" : "For example: Pricing stays at $18 a seat until January."}
                aria-invalid={error ? true : undefined}
                aria-describedby={`${uid}-msg ${uid}-count`}
                onChange={(e) => {
                  setText(e.target.value);
                  if (error) setError(null);
                }}
                onKeyDown={onKey}
                className={fieldClass}
              />
              <div className="flex items-start justify-between gap-3">
                <FieldMsg
                  id={`${uid}-msg`}
                  error={error}
                  hint={full ? `That's the most your agent can carry.` : "Press Enter to add. Each one saves at once."}
                />
                <span id={`${uid}-count`} className="mt-1.5">
                  <CharCount n={text.length} max={limits.charsMax} />
                  <span className="sr-only">
                    {text.length} of {limits.charsMax} characters
                  </span>
                </span>
              </div>
            </div>
            <Button type="button" variant="outline" disabled={saving || full || !text.trim()} aria-busy={saving} onClick={() => void add()}>
              <Plus size={16} weight="bold" aria-hidden />
              {saving ? "Saving" : "Add"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-3.5 flex items-center gap-2 text-[14px] text-ink-3">
          <LockSimple size={15} aria-hidden />
          The meeting has started, so these can no longer change.
        </p>
      )}
    </div>
  );
}
