"use client";

/**
 * The live-caption strip, in the meeting design's shape: a dark scrim floating over the video
 * with the last settled line and, under it, the line still being spoken. Plan 3-4 §3.8 step 1:
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

import { useEffect, useState } from "react";
import { speakerColorIndex, type CaptionLine } from "@/lib/realtime/captions";

/* Speaker identity colours on the always-dark scrim: cs-1..cs-3 are the design's, cs-4..cs-6 are
   added in meeting-call.css. Six is the nominal room size from doc 10's video-grid scope. */
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

/**
 * The mock strip, shown until the caption socket has joined: it plays the mock lines the way the
 * design does, building the interim word by word, holding a beat, then settling it as the final.
 */
export function MockCaptions({ lines }: { lines: { speaker: string; text: string }[] }) {
  const [cap, setCap] = useState({ line: 0, words: 0 });

  useEffect(() => {
    if (lines.length === 0) return;
    const id = window.setInterval(() => {
      setCap((c) => {
        const words = lines[c.line].text.split(" ").length;
        if (c.words >= words + 3) return { line: (c.line + 1) % lines.length, words: 0 };
        return { ...c, words: c.words + 1 };
      });
    }, 300);
    return () => window.clearInterval(id);
  }, [lines]);

  if (lines.length === 0) return null;
  const current = lines[cap.line];
  const interimText = current.text.split(" ").slice(0, cap.words).join(" ");
  const settled = lines[(cap.line + lines.length - 1) % lines.length];

  // Not announced: a looping sample re-read word by word would only be noise to a screen reader.
  return (
    <Strip announce={false}>
      <div className="cap-line">
        <b className={speakerClass(settled.speaker)}>{settled.speaker.split(" ")[0]}</b>
        {settled.text}
      </div>
      <div className="cap-interim">
        {interimText}
        {interimText ? <span className="stream-caret" aria-hidden="true" /> : null}
      </div>
    </Strip>
  );
}
