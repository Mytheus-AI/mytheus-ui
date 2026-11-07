"use client";

/**
 * The speaker-mapping surface. Plan 3-4 §3.8 step 3: "list diarized `speaker_id`s from
 * `meeting_speakers`; let the user assign each to a `user_id`. Show the confidence-scored
 * suggestion as advisory; manual wins."
 *
 * ADVISORY IS THE WHOLE POINT of how the suggestion renders here. A diarization suggestion is a
 * guess with a confidence attached, and R7 makes the human authoritative over it. So a
 * suggested mapping is shown greyed with its confidence stated and the word "suggested", never
 * pre-selected as though it were settled - pre-filling a form with a machine guess is how a
 * user ends up confirming something they never read. A manual assignment renders as settled,
 * with no confidence, because a human's answer does not have one.
 *
 * This component never sends `assignment`. The backend sets `manual` as a SQL literal and a
 * database trigger enforces that manual is never downgraded; see `actions.ts`.
 */

import { useState, useTransition } from "react";
import { CaretDown, Question } from "@phosphor-icons/react";
import { assignSpeaker } from "@/app/(app)/meetings/[meetingId]/transcript/actions";
import { Chip } from "@/components/meetings/Chip";
import type { MeetingSpeaker } from "@/lib/api/transcript";

const FIELD =
  "h-10 w-full min-w-0 rounded-pill border border-line-2 bg-surface px-3 text-[13.5px] text-ink transition-colors placeholder:text-ink-3 hover:border-ink-3 focus-visible:border-signal";

export function SpeakerMapping({
  meetingId,
  speakers,
  people = [],
  lineCounts = {},
}: {
  meetingId: string;
  speakers: MeetingSpeaker[];
  /** Assignable org members, resolved by the page. Empty until a people endpoint is wired,
   *  which is why the control degrades to a plain id field rather than an empty dropdown. */
  people?: { id: string; name: string }[];
  /** `speaker_id` to number of transcript lines, when the page has it. */
  lineCounts?: Record<string, number>;
}) {
  const [pending, startTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const open = speakers.filter((s) => !s.user_id).length;

  const submit = (speakerId: string) => {
    const userId = draft[speakerId]?.trim();
    if (!userId) return;
    setError(null);
    setSavingId(speakerId);
    startTransition(async () => {
      const result = await assignSpeaker(meetingId, speakerId, userId);
      if (!result.ok) {
        setError(
          result.error === "VALIDATION_FAILED"
            ? "That user is not a member of this organization."
            : "Could not save that assignment.",
        );
      } else {
        setDraft((d) => {
          const next = { ...d };
          delete next[speakerId];
          return next;
        });
      }
      setSavingId(null);
    });
  };

  return (
    <section
      id="speakers"
      aria-labelledby="speaker-mapping-heading"
      className="scroll-mt-4 rounded-card border border-line bg-surface p-5"
    >
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 id="speaker-mapping-heading" className="text-[15px] font-semibold text-ink">
          Speakers
        </h2>
        <span className="text-[12.5px] text-ink-3">
          {open > 0 ? `${open} unassigned` : "All matched"}
        </span>
      </div>
      <p className="mb-1.5 text-[13px] text-ink-3">
        Transcription labels each voice it hears. Assign them to people so the transcript reads by
        name.
      </p>

      <ul>
        {speakers.map((s, i) => {
          const lines = lineCounts[s.speaker_id];
          const value = draft[s.speaker_id] ?? "";
          const saving = pending && savingId === s.speaker_id;
          const unassigned = !s.user_id;
          return (
            <li key={s.speaker_id} className={`py-3 ${i > 0 ? "border-t border-line" : ""}`}>
              <div className="mb-2 flex flex-wrap items-center gap-2.5">
                <span
                  aria-hidden
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${
                    unassigned
                      ? "border border-dashed border-priority-medium bg-priority-medium-soft text-priority-medium"
                      : "bg-pill text-[10.5px] font-semibold text-white"
                  }`}
                >
                  {unassigned ? <Question size={14} weight="bold" /> : s.speaker_id.slice(0, 2)}
                </span>
                <span className="text-[13.5px] font-semibold text-ink">Speaker {s.speaker_id}</span>
                {s.assignment === "manual" && s.user_id ? (
                  <Chip tone="accent">Assigned</Chip>
                ) : s.user_id ? (
                  /* Advisory: stated as a guess, with its confidence, and never pre-filled into
                     the control below. */
                  <Chip>
                    Suggested
                    {typeof s.confidence === "number" ? `, ${Math.round(s.confidence * 100)}%` : ""}
                  </Chip>
                ) : (
                  <Chip tone="medium">Unassigned</Chip>
                )}
                {typeof lines === "number" && (
                  <span className="ml-auto text-[12.5px] text-ink-3">
                    {lines} {lines === 1 ? "line" : "lines"}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {people.length > 0 ? (
                  <div className="relative min-w-0 flex-1">
                    <label htmlFor={`sp-${s.speaker_id}`} className="sr-only">
                      Assign speaker {s.speaker_id}
                    </label>
                    <select
                      id={`sp-${s.speaker_id}`}
                      value={value}
                      onChange={(e) => setDraft((d) => ({ ...d, [s.speaker_id]: e.target.value }))}
                      className={`${FIELD} cursor-pointer appearance-none pr-9`}
                    >
                      <option value="">Choose a person...</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <CaretDown
                      size={16}
                      aria-hidden
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"
                    />
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`sp-${s.speaker_id}`} className="sr-only">
                      Assign speaker {s.speaker_id}
                    </label>
                    <input
                      id={`sp-${s.speaker_id}`}
                      value={value}
                      onChange={(e) => setDraft((d) => ({ ...d, [s.speaker_id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          submit(s.speaker_id);
                        }
                      }}
                      placeholder="User id"
                      autoComplete="off"
                      className={FIELD}
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => submit(s.speaker_id)}
                  disabled={pending || !value.trim()}
                  className="h-10 shrink-0 rounded-pill bg-pill px-4 text-[13px] font-semibold text-white transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none motion-reduce:active:scale-100"
                >
                  {saving ? "Saving..." : "Assign"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="mt-1 text-[13px] font-medium text-priority-high" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
