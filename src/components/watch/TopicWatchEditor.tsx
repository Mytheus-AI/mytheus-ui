"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Binoculars, Plus, WarningCircle, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { fieldClass } from "@/components/ui/Form";
import { notifySuccess } from "@/lib/toast";
import { addTopicWatch, removeTopicWatch } from "@/app/actions/topic-watches";
import { PERSONAL_LIMITS, validateTopic, type TopicWatch } from "@/lib/api/personal-types";

/* The chips and the add field. Adding is optimistic: the chip appears at once (quietly, while it
   saves), and a refusal takes it back out, puts the text back in the field and says why. Removing
   is optimistic too, answered by a "Stopped watching" toast with Undo, and a refusal puts the chip
   back where it was. The same rules the API
   enforces are checked as you type (80 characters, no repeats, 20 at most). */

type Chip = TopicWatch & { saving?: boolean };

const SUGGESTIONS = ["SSO", "Pricing", "Hiring plan", "Q4 roadmap"];

export function TopicWatchEditor({ initial }: { initial: TopicWatch[] }) {
  const [chips, setChips] = useState<Chip[]>(initial);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const uid = useId();
  const inputId = `${uid}-topic`;
  const errId = `${uid}-err`;
  const countId = `${uid}-count`;
  const seq = useRef(0);

  const topics = chips.map((c) => c.topic);
  const full = chips.length >= PERSONAL_LIMITS.watches;

  const add = async (raw: string) => {
    const check = validateTopic(raw, topics);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    const tempId = `pending-${++seq.current}`;
    setChips((c) => [...c, { id: tempId, topic: check.topic, created_at: new Date().toISOString(), saving: true }]);
    setDraft("");
    setError(null);
    const res = await addTopicWatch(check.topic, topics);
    if (res.ok) {
      setChips((c) => c.map((x) => (x.id === tempId ? { ...res.watch, topic: res.watch.topic || check.topic } : x)));
      notifySuccess(`Watching ${check.topic}`);
    } else {
      setChips((c) => c.filter((x) => x.id !== tempId));
      setDraft((d) => d || check.topic);
      setError(res.message);
      input.current?.focus();
    }
  };

  // The latest `add`, for the Undo in a removal toast (which runs after the list has changed).
  const addRef = useRef(add);
  addRef.current = add;

  const remove = async (chip: Chip, index: number) => {
    setChips((c) => c.filter((x) => x.id !== chip.id));
    setError(null);
    // Focus moves to the next chip's remove button, or the field when none is left.
    window.setTimeout(() => {
      const next = document.querySelectorAll<HTMLButtonElement>(`[data-watch-remove="${uid}"]`)[index] ?? null;
      (next ?? input.current)?.focus();
    }, 0);
    const res = await removeTopicWatch(chip.id);
    if (res.ok) {
      notifySuccess(`Stopped watching ${chip.topic}`, { undo: () => void addRef.current(chip.topic) });
      return;
    }
    setChips((c) => {
      if (c.some((x) => x.id === chip.id)) return c;
      const copy = [...c];
      copy.splice(Math.min(index, copy.length), 0, chip);
      return copy;
    });
    setError(res.message);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void add(draft);
  };

  return (
    <div>
      {chips.length > 0 ? (
        <ul aria-label="Watched topics" className="flex flex-wrap gap-2">
          {chips.map((c, i) => (
            <li
              key={c.id}
              aria-busy={c.saving || undefined}
              className={`inline-flex h-10 max-w-full items-center gap-1 rounded-full bg-signal-soft pl-3.5 pr-1 text-[14px] font-semibold text-signal-ink transition-opacity ${
                c.saving ? "opacity-60" : ""
              }`}
            >
              <span className="truncate">{c.topic}</span>
              <button
                type="button"
                data-watch-remove={uid}
                disabled={c.saving}
                onClick={() => void remove(c, i)}
                aria-label={`Stop watching ${c.topic}`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-[color-mix(in_srgb,var(--signal)_16%,transparent)] disabled:cursor-wait"
              >
                <X size={14} weight="bold" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-ctl bg-surface-2 px-4 py-3.5">
          <div className="flex items-start gap-2.5">
            <Binoculars size={18} aria-hidden className="mt-0.5 shrink-0 text-ink-3" />
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-ink">No topics yet</p>
              <p className="mt-0.5 text-[14px] text-ink-3">Try a project, a customer or a codename.</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void add(s)}
                aria-label={`Watch ${s}`}
                className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-full border border-line-2 bg-surface px-2.5 text-[13px] font-semibold text-ink-2 transition-colors hover:border-ink-4 hover:text-ink"
              >
                <Plus size={11} weight="bold" aria-hidden />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={submit} className="mt-4 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className="sr-only">
            Add a topic to watch
          </label>
          <input
            ref={input}
            id={inputId}
            value={draft}
            disabled={full}
            maxLength={PERSONAL_LIMITS.topic + 20}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError(null);
            }}
            placeholder={full ? "Remove a topic to add another" : "Add a topic"}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${countId}${error ? ` ${errId}` : ""}`}
            className={`${fieldClass} disabled:cursor-not-allowed`}
          />
        </div>
        <Button type="submit" variant="outline" disabled={full || !draft.trim()} className="shrink-0">
          <Plus size={15} weight="bold" aria-hidden />
          Watch
        </Button>
      </form>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        {error ? (
          <p id={errId} role="alert" className="flex items-center gap-1.5 text-[14px] text-priority-high">
            <WarningCircle size={15} weight="fill" aria-hidden className="shrink-0" />
            {error}
          </p>
        ) : (
          <span />
        )}
        <p id={countId} className="text-[12.5px] text-ink-3">
          {chips.length} of {PERSONAL_LIMITS.watches} topics
        </p>
      </div>
    </div>
  );
}
