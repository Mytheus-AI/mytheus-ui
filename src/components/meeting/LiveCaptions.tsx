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

import { useEffect, useRef, type ReactNode } from "react";
import { speakerColorIndex, type CaptionLine } from "@/lib/realtime/captions";

/* Speaker identity colours, lifted so they hold AA on the always-dark caption scrim in both
   themes (the scrim does not flip with the theme, so token colours would not work here). Six is
   the nominal room size from doc 10's video-grid scope, so a seventh speaker wrapping around is
   the intended degradation rather than an unbounded palette. */
const SPEAKER_COLORS = [
  "text-[#f2a184]",
  "text-[#8fc4de]",
  "text-[#e1c484]",
  "text-[#b0d09c]",
  "text-[#e3b4d6]",
  "text-[#f3f0e8]",
] as const;

export function speakerColor(index: number): string {
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
}

/* The frame: a centred dark scrim of fixed height. It is shared with the mock strip in
   `MeetingRoom` so the mock and the live stream look identical. The inner region scrolls and the
   content hugs the bottom (`mt-auto`), so the newest line is always the one at the bottom edge. */
export function CaptionFrame({
  children,
  tailRef,
}: {
  children: ReactNode;
  tailRef?: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div className="w-full max-w-[760px] shrink-0 self-center rounded-card bg-[rgba(26,24,22,0.8)] px-4 py-2.5 text-[rgba(250,249,244,0.96)] backdrop-blur-md max-[959px]:px-3 max-[959px]:py-2">
      <div
        className="flex h-[64px] flex-col overflow-y-auto min-[960px]:h-[72px]"
        role="log"
        aria-live="polite"
        aria-label="Live captions"
      >
        <div className="mt-auto space-y-0.5">
          {children}
          <div ref={tailRef} />
        </div>
      </div>
    </div>
  );
}

export function CaptionText({
  speaker,
  colorIndex,
  interim = false,
  children,
}: {
  speaker: string;
  colorIndex: number;
  interim?: boolean;
  children: ReactNode;
}) {
  return (
    <p
      className={`text-[14px] font-medium leading-[1.5] max-[959px]:text-[13px] ${
        interim ? "italic text-white/75" : "text-white/95"
      }`}
    >
      <span className={`mr-2 font-extrabold not-italic ${speakerColor(colorIndex)}`}>{speaker}</span>
      {children}
      {interim ? (
        <span
          aria-hidden
          className="ml-1 inline-block h-[13px] w-[6px] rounded-sm bg-signal-bright align-[-2px] motion-safe:animate-pulse"
        />
      ) : null}
    </p>
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
  const tailRef = useRef<HTMLDivElement | null>(null);

  // Keep the newest line in view. Scrolling the strip's own container, never the page, so a
  // caption can never yank the whole room layout.
  useEffect(() => {
    tailRef.current?.scrollIntoView({ block: "end" });
  }, [lines]);

  return (
    <CaptionFrame tailRef={tailRef}>
      {lines.length === 0 ? (
        <p className="text-[14px] leading-[1.5] text-white/75">Waiting for speech...</p>
      ) : (
        lines.map((line) => (
          <CaptionText
            key={line.chunkId}
            speaker={speakerLabel?.(line.speakerId) ?? `Speaker ${line.speakerId}`}
            colorIndex={speakerColorIndex(line.speakerId, SPEAKER_COLORS.length)}
            interim={!line.isFinal}
          >
            {line.text}
          </CaptionText>
        ))
      )}
    </CaptionFrame>
  );
}
