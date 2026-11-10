"use client";

/**
 * The live-caption strip: a light card floating over the bottom of the stage with the last
 * settled line and, under it, the line still being spoken. Plan 3-4 §3.8 step 1:
 * "interim-then-final, no layout shift, append-only final track".
 *
 * NO LAYOUT SHIFT is what shapes this file:
 *
 *  1. Interims REPLACE their own line by `chunkId` (handled in `lib/realtime/captions.ts`), so a
 *     revising utterance never adds a row.
 *  2. The strip is absolutely positioned over the video frame, so a caption arriving can never
 *     reflow the stage. Each of its two rows is clamped to two lines and the interim row keeps a
 *     minimum height, so the strip itself barely moves either.
 *  3. Only the tail is shown. A caption strip is a "what was just said" surface; the full record
 *     is the transcript view (§3.8 step 2).
 *
 * Interims are rendered dimmer and italic rather than hidden. Hiding them until final would
 * cost the entire latency benefit of interims - the p95 < 2 s promise is about the interim, not
 * the final - and showing them identically to finals would misrepresent provisional text as
 * settled.
 */

import { speakerColorIndex, type CaptionLine } from "@/lib/realtime/captions";

/* A stable per-speaker hook (`cs-1`..`cs-6`; six is the nominal room size from doc 10's video-grid
   scope). The light strip names every speaker in ink, so the hook carries no colour today. */
const PALETTE = 6;

function speakerClass(speakerId: string) {
  return `cs-${speakerColorIndex(speakerId, PALETTE) + 1}`;
}

function Strip({ children, announce = true }: { children: React.ReactNode; announce?: boolean }) {
  return (
    <div className="captions" role="log" aria-live={announce ? "polite" : "off"} aria-label="Live captions">
      {children}
    </div>
  );
}

export function LiveCaptions({
  lines,
  speakerLabel,
}: {
  lines: CaptionLine[];
  /** Maps a diarized `speakerId` to a display name once `meeting_speakers` resolves one.
   *  Falls back to the raw label, which is what the user sees before any mapping exists. */
  speakerLabel?: (speakerId: string) => string;
}) {
  const name = (id: string) => speakerLabel?.(id) ?? `Speaker ${id}`;
  const last = lines[lines.length - 1];
  const interim = last && !last.isFinal ? last : undefined;
  const finals = lines.filter((l) => l.isFinal);
  const settled = finals[finals.length - 1];

  return (
    <Strip>
      {settled ? (
        <div className="cap-line">
          <b className={speakerClass(settled.speakerId)}>{name(settled.speakerId)}</b>
          {settled.text}
        </div>
      ) : null}
      <div className="cap-interim">
        {interim ? (
          <>
            {settled && settled.speakerId === interim.speakerId ? null : <b>{name(interim.speakerId)}</b>}
            {interim.text}
            <span className="stream-caret" aria-hidden="true" />
          </>
        ) : lines.length === 0 ? (
          "Waiting for speech..."
        ) : null}
      </div>
    </Strip>
  );
}
