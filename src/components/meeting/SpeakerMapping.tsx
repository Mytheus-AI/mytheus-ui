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
import { CaretDown } from "@phosphor-icons/react";
import { assignSpeaker } from "@/app/(app)/meetings/[meetingId]/transcript/actions";
import type { MeetingSpeaker } from "@/lib/api/transcript";

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
      className="panel reveal tx-spk"
      style={{ animationDelay: ".14s" }}
    >
      <div className="panel-head">
        <h2 id="speaker-mapping-heading">Speakers</h2>
        <span className="count-chip">{speakers.length}</span>
        <span className="tx-head-note">{open > 0 ? `${open} unassigned` : "All matched"}</span>
      </div>
      <div className="panel-body">
        <p className="row-sum" style={{ marginTop: 0 }}>
          Transcription labels each voice it hears. Assign them to people so the transcript reads
          by name.
        </p>
      </div>

      <ul className="tx-spk-list">
        {speakers.map((s) => {
          const lines = lineCounts[s.speaker_id];
          const value = draft[s.speaker_id] ?? "";
          const saving = pending && savingId === s.speaker_id;
          return (
            <li key={s.speaker_id} className="panel-row tx-spk-row">
              <div className="tx-spk-top">
                <strong>Speaker {s.speaker_id}</strong>
                {s.assignment === "manual" && s.user_id ? (
                  <span className="tag tag-green">Assigned</span>
                ) : s.user_id ? (
                  /* Advisory: stated as a guess, with its confidence, and never pre-filled into
                     the control below. */
                  <span className="tag tag-neutral">
                    Suggested
                    {typeof s.confidence === "number" ? `, ${Math.round(s.confidence * 100)}%` : ""}
                  </span>
                ) : (
                  <span className="tag tag-brown">Unassigned</span>
                )}
                {typeof lines === "number" && (
                  <small>
                    {lines} {lines === 1 ? "line" : "lines"}
                  </small>
                )}
              </div>

              <div className="tx-spk-form">
                <label htmlFor={`sp-${s.speaker_id}`} className="sr-only">
                  Assign speaker {s.speaker_id}
                </label>
                {people.length > 0 ? (
                  <span className="tx-field-wrap">
                    <select
                      id={`sp-${s.speaker_id}`}
                      value={value}
                      onChange={(e) => setDraft((d) => ({ ...d, [s.speaker_id]: e.target.value }))}
                      className="tx-field"
                    >
                      <option value="">Choose a person...</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <CaretDown size={13} weight="bold" aria-hidden className="tx-field-chev" />
                  </span>
                ) : (
                  <span className="tx-field-wrap">
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
                      className="tx-field"
                    />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => submit(s.speaker_id)}
                  disabled={pending || !value.trim()}
                  className="assign-btn tap"
                >
                  {saving ? "Saving..." : "Assign"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="tx-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
