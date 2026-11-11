"use client";

import { useId, useState } from "react";
import { CheckCircle, MinusCircle, XCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { CharCount, FieldMsg, textareaClass } from "@/components/ui/Form";
import type { Bet, Outcome } from "@/lib/api/bets-types";
import { LIMITS } from "@/lib/bets";

/* The owner's call on a bet: hit, partly or missed, whether the assumption held, and the lesson
   for the next similar decision. When a connected metric suggested an outcome it is chosen
   already, and says so; the person still decides. */

const CHOICES: { k: Outcome; t: string; s: string; Icon: typeof CheckCircle; tone: string }[] = [
  { k: "hit", t: "Hit", s: "It did what we expected", Icon: CheckCircle, tone: "text-ok" },
  { k: "partly", t: "Partly", s: "Some of it, or later", Icon: MinusCircle, tone: "text-priority-medium" },
  { k: "missed", t: "Missed", s: "It did not happen", Icon: XCircle, tone: "text-priority-high" },
];

export function BetResolveForm({
  bet,
  saving,
  error,
  onResolve,
  onCancel,
}: {
  bet: Bet;
  saving: boolean;
  error: string | null;
  onResolve: (input: { outcome: Outcome; assumption_held: boolean | null; lesson: string }) => void;
  onCancel?: () => void;
}) {
  const id = useId();
  const [outcome, setOutcome] = useState<Outcome | null>(bet.outcome ?? bet.suggested_outcome ?? null);
  const [held, setHeld] = useState<"yes" | "no" | "unsure">(bet.assumption_held === true ? "yes" : bet.assumption_held === false ? "no" : "unsure");
  const [lesson, setLesson] = useState(bet.lesson ?? "");
  const [missing, setMissing] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outcome) {
      setMissing(true);
      document.getElementById(`${id}-hit`)?.focus();
      return;
    }
    onResolve({ outcome, assumption_held: held === "yes" ? true : held === "no" ? false : null, lesson });
  };

  return (
    <form onSubmit={submit} noValidate aria-label="Score this bet" className="grid gap-5">
      <fieldset aria-describedby={`${id}-outcome-msg`}>
        <legend className="text-[15px] font-semibold text-ink">How did it turn out?</legend>
        {bet.suggested_outcome && !bet.outcome ? (
          <p className="mt-0.5 text-[13.5px] text-ink-3">The numbers point to {bet.suggested_outcome}. It is chosen for you; change it if you know better.</p>
        ) : null}
        <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
          {CHOICES.map(({ k, t, s, Icon, tone }) => (
            <label
              key={k}
              className={`flex cursor-pointer items-start gap-2.5 rounded-ctl border p-3 transition-colors has-[:focus-visible]:shadow-[0_0_0_4px_var(--signal-soft)] ${
                outcome === k ? "border-ink bg-surface-2" : "border-line-2 bg-surface hover:bg-surface-2"
              }`}
            >
              <input
                id={`${id}-${k}`}
                type="radio"
                name={`${id}-outcome`}
                value={k}
                checked={outcome === k}
                onChange={() => {
                  setOutcome(k);
                  setMissing(false);
                }}
                className="sr-only"
              />
              <Icon size={20} weight={outcome === k ? "fill" : "regular"} aria-hidden className={tone} />
              <span>
                <span className="block text-[15px] font-semibold text-ink">{t}</span>
                <span className="block text-[13px] text-ink-3">{s}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldMsg id={`${id}-outcome-msg`} error={missing ? "Choose hit, partly or missed." : null} />
      </fieldset>

      {bet.assumption ? (
        <fieldset>
          <legend className="text-[14px] font-semibold text-ink">Did the assumption hold?</legend>
          <p className="mt-0.5 text-[13.5px] text-ink-3">{bet.assumption}</p>
          <div role="presentation" className="mt-2 inline-flex flex-wrap gap-1 rounded-ctl bg-bg-2 p-1">
            {(
              [
                { k: "yes", t: "It held" },
                { k: "no", t: "It did not" },
                { k: "unsure", t: "Not sure" },
              ] as const
            ).map(({ k, t }) => (
              <label
                key={k}
                className={`cursor-pointer rounded-ctl px-3.5 py-2 text-[14px] font-semibold transition-colors has-[:focus-visible]:shadow-[0_0_0_3px_var(--signal-soft)] ${
                  held === k ? "bg-surface text-ink" : "text-ink-3 hover:text-ink"
                }`}
              >
                <input type="radio" name={`${id}-held`} value={k} checked={held === k} onChange={() => setHeld(k)} className="sr-only" />
                {t}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div>
        <label htmlFor={`${id}-lesson`} className="block text-[14px] font-semibold text-ink">
          What should the next similar decision learn?
        </label>
        <span className="mt-0.5 block text-[13px] text-ink-3">
          Shared with the workspace on How good are our calls, without your name. Optional.
        </span>
        <textarea
          id={`${id}-lesson`}
          rows={3}
          value={lesson}
          maxLength={LIMITS.lesson}
          onChange={(e) => setLesson(e.target.value)}
          placeholder="Price changes need a full quarter before churn moves"
          className={`${textareaClass} mt-2`}
        />
        <div className="mt-1 flex justify-end">
          <CharCount n={lesson.length} max={LIMITS.lesson} />
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-ctl bg-priority-high-soft px-3.5 py-2.5 text-[14px] text-priority-high">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2.5">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving" : bet.status === "resolved" ? "Save your call" : "Score this bet"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
