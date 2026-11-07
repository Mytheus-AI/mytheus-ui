import { resolveSpeaker } from "@/components/meetings/transcript-utils";
import type { MeetingSpeaker, TranscriptChunk } from "@/lib/api/transcript";

/** The meeting design colours each named speaker with one of three tones (`sp-1`..`sp-3`, in
 *  order of first appearance, cycling) and an unmatched voice with `sp-unknown`. */
export function speakerTones(
  chunks: TranscriptChunk[],
  speakers: MeetingSpeaker[],
  speakerNames: Record<string, string>,
  speakerLabels: Record<string, string>,
): Record<string, string> {
  const tones: Record<string, string> = {};
  let named = 0;
  for (const c of chunks) {
    if (tones[c.speaker_id]) continue;
    const who = resolveSpeaker(c.speaker_id, speakers, speakerNames, speakerLabels);
    tones[c.speaker_id] = who.named ? `sp-${(named++ % 3) + 1}` : "sp-unknown";
  }
  return tones;
}
