import type { MeetingSpeaker } from "@/lib/api/transcript";

/* Pure helpers shared by the transcript reader and the talk-time card, so both resolve a speaker
   to the same label. A label is never guessed: it comes from a mapped user name, an explicit
   label override (the mock fixtures carry names), or the raw diarized id as "Speaker {id}". */

export function formatOffset(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export interface ResolvedSpeaker {
  label: string;
  /** True when the label is a person's name rather than a raw "Speaker N". */
  named: boolean;
}

export function resolveSpeaker(
  speakerId: string,
  speakers: MeetingSpeaker[],
  speakerNames: Record<string, string>,
  speakerLabels: Record<string, string>,
): ResolvedSpeaker {
  const override = speakerLabels[speakerId];
  if (override) return { label: override, named: true };
  const mapped = speakers.find((s) => s.speaker_id === speakerId);
  const name = mapped?.user_id ? speakerNames[mapped.user_id] : undefined;
  return name ? { label: name, named: true } : { label: `Speaker ${speakerId}`, named: false };
}
