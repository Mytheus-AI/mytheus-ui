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
import { assignSpeaker } from "@/app/(app)/meetings/[meetingId]/transcript/actions";
import type { MeetingSpeaker } from "@/lib/api/transcript";

export function SpeakerMapping({
  meetingId,
  speakers,
  people = [],
}: {
  meetingId: string;
  speakers: MeetingSpeaker[];
  /** Assignable org members, resolved by the page. Empty until a people endpoint is wired,
   *  which is why the control degrades to a plain id field rather than an empty dropdown. */
  people?: { id: string; name: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const submit = (speakerId: string) => {
    const userId = draft[speakerId]?.trim();
    if (!userId) return;
    setError(null);
    startTransition(async () => {
      const result = await assignSpeaker(meetingId, speakerId, userId);
      if (!result.ok) {
        setError(
          result.error === "VALIDATION_FAILED"
            ? "That user is not a member of this organization."
            : "Could not save that assignment.",
        );
      }
    });
  };

  return (
    <section aria-labelledby="speaker-mapping-heading">
      <h2
        id="speaker-mapping-heading"
        className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-3"
      >
        Speakers
      </h2>
      <p className="mt-1.5 text-[13px] text-ink-3">
        Transcription labels each voice it hears. Assign them to people so the transcript reads
        by name.
      </p>

      <ul className="mt-4 space-y-2">
        {speakers.map((s) => (
          <li
            key={s.speaker_id}
            className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface px-4 py-3"
          >
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink-2">
              Speaker {s.speaker_id}
            </span>

            {s.assignment === "manual" && s.user_id ? (
              <span className="rounded-pill bg-signal-soft px-2 py-0.5 text-[11.5px] text-signal-deep">
                Assigned
              </span>
            ) : s.user_id ? (
              /* Advisory: stated as a guess, with its confidence, and never pre-filled into the
                 control below. */
              <span className="text-[12px] text-ink-3">
                Suggested{typeof s.confidence === "number" ? ` · ${Math.round(s.confidence * 100)}%` : ""}
              </span>
            ) : (
              <span className="text-[12px] text-ink-3">Unassigned</span>
            )}

            <label className="ml-auto flex items-center gap-2">
              <span className="sr-only">Assign speaker {s.speaker_id}</span>
              {people.length > 0 ? (
                <select
                  value={draft[s.speaker_id] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [s.speaker_id]: e.target.value }))}
                  className="min-h-[36px] rounded-pill border border-line bg-surface px-3 text-[13px] text-ink"
                >
                  <option value="">Choose a person…</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={draft[s.speaker_id] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [s.speaker_id]: e.target.value }))}
                  placeholder="user id"
                  className="min-h-[36px] w-[260px] rounded-pill border border-line bg-surface px-3 text-[13px] text-ink placeholder:text-ink-3"
                />
              )}
              <button
                type="button"
                onClick={() => submit(s.speaker_id)}
                disabled={pending || !draft[s.speaker_id]?.trim()}
                className="min-h-[36px] rounded-pill bg-signal px-4 text-[13px] font-medium text-white transition-colors hover:bg-signal-deep disabled:opacity-40"
              >
                {pending ? "Saving…" : "Assign"}
              </button>
            </label>
          </li>
        ))}
      </ul>

      {error && (
        <p className="mt-3 text-[12.5px] text-priority-high" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
