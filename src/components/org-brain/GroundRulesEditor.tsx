"use client";

import { useState, type FormEvent } from "react";
import { Info, Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { ChipInput } from "@/components/settings/ChipInput";
import { saveGroundRules } from "@/app/actions/org-brain";
import { BRAIN_LIMITS, cleanTopics, validateGroundRules } from "@/lib/api/org-brain-types";
import { FieldMsg, FlashLine, useFlash } from "./ui";

/* Ground rules (ADR-0039 A5, C2): topics agents must never note, suggest or carry forward. The
   page says plainly what this is: an instruction the agents follow, not a technical guarantee.
   Saving an empty list still counts as setting the rules ("we have none"), which readiness asks
   for. */

const L = BRAIN_LIMITS.groundRules;
const SUGGESTED = ["Salaries and pay", "Layoffs", "Health and medical", "Performance reviews", "Legal disputes", "Fundraising terms"];

/** The honest note, shared with the setup and the welcome brief. */
export function GroundRulesHonesty({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-start gap-3 rounded-ctl bg-priority-medium-soft px-4 py-3.5 ${className}`}>
      <Info size={20} weight="fill" className="mt-0.5 shrink-0 text-priority-medium" aria-hidden />
      <p className="text-[14px] leading-relaxed text-ink-2">
        <span className="font-semibold text-ink">This is an instruction to the agents, not a guarantee.</span> When a stretch of a meeting
        is mainly about one of these topics, agents are told to keep no note, suggestion or action from it. Transcripts are still
        recorded as usual, and an agent can misjudge what a conversation is about. For anything that must never be captured, do not
        discuss it in a recorded meeting.
      </p>
    </div>
  );
}

export function GroundRulesEditor({ initial, canEdit }: { initial: string[]; canEdit: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [topics, setTopics] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useFlash();
  const dirty = topics.join("\n") !== saved.join("\n");
  const suggestions = SUGGESTED.filter((s) => !topics.some((t) => t.toLowerCase() === s.toLowerCase()));

  if (!canEdit)
    return (
      <div className="grid gap-4">
        {initial.length ? (
          <ul className="flex flex-wrap gap-2" aria-label="Never recorded">
            {initial.map((t) => (
              <li key={t} className="rounded-full border border-dashed border-line-2 bg-surface px-3 py-1.5 text-[14px] font-medium text-ink-2">
                {t}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-ink-3">No topics are set. Agents keep notes on everything said in a meeting.</p>
        )}
        <GroundRulesHonesty />
      </div>
    );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const checked = validateGroundRules(topics);
    if (!checked.ok) {
      setError(checked.errors.never_record_topics ?? null);
      document.getElementById("never-record")?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    setFlash({ tone: "busy", text: "Saving" });
    const res = await saveGroundRules(checked.value.never_record_topics);
    setSaving(false);
    if (res.ok) {
      setSaved(res.data.never_record_topics);
      setTopics(res.data.never_record_topics);
      setFlash({
        tone: "ok",
        text: res.data.never_record_topics.length ? "Ground rules saved. Agents follow them from the next meeting." : "Saved: no topics are off limits.",
      });
    } else {
      setError(res.fieldErrors?.never_record_topics ?? null);
      setFlash({ tone: "error", text: res.message });
    }
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <form onSubmit={submit} noValidate aria-busy={saving || undefined} className="overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
        <div className="px-4 py-5 sm:px-[22px]">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="never-record" className="text-[15px] font-semibold text-ink">
              Never record notes about
            </label>
            <span aria-hidden className="text-[13px] tabular-nums text-ink-3">
              {topics.length} of {L.max}
            </span>
          </div>
          <div className="mt-1.5">
            <ChipInput
              id="never-record"
              value={topics}
              onChange={(v) => {
                setTopics(v);
                setError(null);
              }}
              max={L.max}
              itemMax={L.itemMax}
              placeholder="Type a topic and press Enter"
              describedBy="never-record-msg"
              invalid={!!error}
              noun="topic"
            />
          </div>
          <FieldMsg id="never-record-msg" error={error} hint="Short topics work best, the way people would name them out loud." />

          {suggestions.length ? (
            <div className="mt-5">
              <p className="text-[13px] font-semibold text-ink-3">Common choices</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      disabled={topics.length >= L.max}
                      onClick={() => setTopics((t) => cleanTopics([...t, s]))}
                      aria-label={`Add ${s}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-line-2 px-3 text-[13.5px] font-medium text-ink-2 transition-colors hover:border-solid hover:bg-surface-2 hover:text-ink focus-visible:!rounded-full disabled:opacity-40"
                    >
                      <Plus size={13} weight="bold" aria-hidden />
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-surface-2 px-4 py-3.5 sm:px-[22px]">
          <Button type="submit" disabled={saving || (!dirty && saved.length > 0)} className="focus-visible:!rounded-ctl">
            {saving ? "Saving" : saved.length === 0 && topics.length === 0 ? "Save with no topics" : "Save ground rules"}
          </Button>
          <FlashLine flash={flash ?? (dirty ? { tone: "busy", text: "Unsaved changes" } : null)} />
        </div>
      </form>

      <aside className="grid gap-4 xl:sticky xl:top-4" aria-label="How agents treat these topics">
        <GroundRulesHonesty />
        <div className="rounded-card border border-line bg-surface-2 p-5">
          <p className="text-[15px] font-semibold text-ink">What changes in a meeting</p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-ink-2 marker:text-ink-4">
            <li>No personal notes, suggestions or action items from that stretch.</li>
            <li>The meeting agent writes no agenda notes about it.</li>
            <li>Captions and the transcript are unchanged.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
