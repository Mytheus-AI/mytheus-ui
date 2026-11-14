"use client";

import { Waveform } from "@phosphor-icons/react";
import { primeTalk, useCanTalk } from "./voice";

/* "Talk" (ADR-0049 F6): opens voice mode. Shown only where the browser can record the microphone. `compact` is
   the sheet header's icon button; otherwise a quiet pill with its label. */
export function TalkButton({ name, onTalk, compact = false, disabled = false }: { name: string; onTalk: () => void; compact?: boolean; disabled?: boolean }) {
  const can = useCanTalk();
  if (!can) return null;
  // The tap itself unlocks the audio, so the Myte's greeting can be heard (autoplay rules).
  const talk = () => {
    primeTalk();
    onTalk();
  };
  return compact ? (
    <button
      type="button"
      onClick={talk}
      disabled={disabled}
      aria-label={`Talk to ${name}`}
      title="Talk: a voice conversation"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-ctl text-ink-3 transition-colors hover:bg-bg-2 hover:text-ink disabled:opacity-40"
    >
      <Waveform size={19} aria-hidden />
    </button>
  ) : (
    <button
      type="button"
      onClick={talk}
      disabled={disabled}
      aria-label={`Talk to ${name}`}
      title="Talk: a voice conversation"
      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line-2 bg-surface px-3.5 text-[14px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40"
    >
      <Waveform size={17} aria-hidden />
      Talk
    </button>
  );
}
