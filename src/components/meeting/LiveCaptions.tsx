"use client";

/**
 * The live-caption strip. Plan 3-4 §3.8 step 1: "interim-then-final, no layout shift,
 * append-only final track".
 *
 * NO LAYOUT SHIFT is the requirement that shapes this file. Three things protect it:
 *
 *  1. Interims REPLACE their own line by `chunkId` (handled in `lib/realtime/captions.ts`), so a
 *     revising utterance never adds a row.
 *  2. The strip is a fixed-height scroll region, not a growing block. A caption arriving must
 *     not reflow the video grid above it, which is what an auto-growing strip would do on every
 *     single utterance.
 *  3. Only the tail is shown, pinned to the bottom. A caption strip is a "what was just said"
 *     surface; the full record is the transcript view (§3.8 step 2).
 *
 * Interims are rendered dimmer and italic rather than hidden. Hiding them until final would
 * cost the entire latency benefit of interims - the p95 < 2 s promise is about the interim, not
 * the final - and showing them identically to finals would misrepresent provisional text as
 * settled.
 */

import { useEffect, useRef } from "react";
import { speakerColorIndex, type CaptionLine } from "@/lib/realtime/captions";

/* Speaker colors read from the token layer, never raw hex (this repo's styling rule). Six is
   the nominal room size from doc 10's video-grid scope, so a seventh speaker wrapping around is
   the intended degradation rather than an unbounded palette. */
const SPEAKER_COLORS = [
  "text-signal-deep",
  "text-priority-low",
  "text-priority-medium",
  "text-priority-high",
  "text-ink",
  "text-ink-2",
] as const;

export function LiveCaptions({
  lines,
  speakerLabel,
}: {
  lines: CaptionLine[];
  /** Maps a diarized `speakerId` to a display name once `meeting_speakers` resolves one.
   *  Falls back to the raw label, which is what the user sees before any mapping exists. */
  speakerLabel?: (speakerId: string) => string;
}) {
  const tailRef = useRef<HTMLDivElement | null>(null);

  // Keep the newest line in view. Scrolling the strip's own container, never the page, so a
  // caption can never yank the whole room layout.
  useEffect(() => {
    tailRef.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  return (
    <div className="mt-3 rounded-card border border-line bg-white/90 px-4 py-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-3">Live captions</p>

      {/* Fixed height: the strip scrolls internally, so arriving captions never reflow the grid
          above. `aria-live="polite"` announces new captions without stealing focus. */}
      <div
        className="mt-1.5 h-[68px] space-y-1 overflow-y-auto"
        aria-live="polite"
        aria-label="Live captions"
      >
        {lines.length === 0 ? (
          <p className="text-[13px] leading-snug text-ink-3">Waiting for speech…</p>
        ) : (
          lines.map((line) => (
            <p
              key={line.chunkId}
              className={`text-[13px] leading-snug ${
                line.isFinal ? "text-ink" : "italic text-ink-3"
              }`}
            >
              <span
                className={`mr-2 font-mono text-[10px] uppercase tracking-wider ${
                  SPEAKER_COLORS[speakerColorIndex(line.speakerId, SPEAKER_COLORS.length)]
                }`}
              >
                {speakerLabel?.(line.speakerId) ?? `Speaker ${line.speakerId}`}
              </span>
              {line.text}
            </p>
          ))
        )}
        <div ref={tailRef} />
      </div>
    </div>
  );
}
