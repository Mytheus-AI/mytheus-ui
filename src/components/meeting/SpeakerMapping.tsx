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
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHead } from "@/components/ui/Card";
import { Dropdown } from "@/components/ui/Dropdown";
import { Chip } from "@/components/meetings/Chip";
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
    <Card as="section" flush id="speakers" aria-labelledby="speaker-mapping-heading" className="tx-spk">
      <CardHead
        id="speaker-mapping-heading"
        title="Speakers"
        description="Transcription labels each voice it hears. Match each one to a teammate and the transcript reads by name."
        right={<span className="text-[14px] text-ink-3">{open > 0 ? `${open} not matched` : "All matched"}</span>}
      />
      <CardBody>
        <ul className="tx-spk-list">
          {speakers.map((s) => {
            const lines = lineCounts[s.speaker_id];
            const value = draft[s.speaker_id] ?? "";
            const saving = pending && savingId === s.speaker_id;
            const unmatched = !s.user_id;
            return (
              <li key={s.speaker_id} className={`tx-spk-row${unmatched ? " is-unk" : ""}`}>
                <div className="tx-spk-top">
                  <span className="mx-av sm tx-spk-av" aria-hidden="true">
                    {s.speaker_id}
                  </span>
                  <strong>Speaker {s.speaker_id}</strong>
                  {typeof lines === "number" && (
                    <small>
                      {lines} {lines === 1 ? "line" : "lines"}
                    </small>
                  )}
                  {s.assignment === "manual" && s.user_id ? (
                    <Chip tone="ok">Matched</Chip>
                  ) : s.user_id ? (
                    /* Advisory: stated as a guess, with its confidence, and never pre-filled into
                     the control below. */
                    <Chip>
                      Suggested
                      {typeof s.confidence === "number" ? `, ${Math.round(s.confidence * 100)}%` : ""}
                    </Chip>
                  ) : (
                    <Chip tone="medium">Not matched</Chip>
                  )}
                </div>

                <div className="tx-spk-form">
                  <label htmlFor={`sp-${s.speaker_id}`} className="sr-only">
                    Assign speaker {s.speaker_id}
                  </label>
                  {people.length > 0 ? (
                    <Dropdown
                      id={`sp-${s.speaker_id}`}
                      label={`Assign speaker ${s.speaker_id}`}
                      size="md"
                      className="tx-field-wrap"
                      value={value || null}
                      placeholder="Choose a person..."
                      options={people.map((p) => ({ value: p.id, label: p.name }))}
                      onChange={(v) => setDraft((d) => ({ ...d, [s.speaker_id]: v }))}
                    />
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
                  <Button type="button" size="sm" onClick={() => submit(s.speaker_id)} disabled={pending || !value.trim()}>
                    {saving ? "Saving..." : "Assign"}
                  </Button>
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
      </CardBody>
    </Card>
  );
}
