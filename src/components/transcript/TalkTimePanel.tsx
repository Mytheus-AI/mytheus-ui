import { resolveSpeaker, wordCount } from "@/components/meetings/transcript-utils";
import type { MeetingSpeaker, TranscriptChunk } from "@/lib/api/transcript";

/* Talk time, as a card in the transcript's rail. Share of words per speaker, counted from the
   transcript lines themselves, with the same label resolution as the reader. */
export function TalkTimePanel({
  chunks,
  speakers,
  speakerNames = {},
  speakerLabels = {},
}: {
  chunks: TranscriptChunk[];
  speakers: MeetingSpeaker[];
  speakerNames?: Record<string, string>;
  speakerLabels?: Record<string, string>;
}) {
  const words = new Map<string, number>();
  let all = 0;
  for (const c of chunks) {
    const n = wordCount(c.text);
    words.set(c.speaker_id, (words.get(c.speaker_id) ?? 0) + n);
    all += n;
  }
  if (all === 0) return null;

  const rows = Array.from(words.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => {
      const who = resolveSpeaker(id, speakers, speakerNames, speakerLabels);
      return {
        id,
        label: who.named ? who.label.split(" ")[0] : who.label,
        full: who.label,
        share: Math.round((n / all) * 100),
      };
    });

  return (
    <section className="mx-card mx-card-pad" aria-labelledby="tx-talk-h">
      <div className="mx-card-head">
        <h2 className="mx-card-title" id="tx-talk-h">
          Talk time
        </h2>
        <span className="mx-card-note">Share of words</span>
      </div>
      {rows.map((s) => (
        <div className="md-talk-row tx-talk-row" key={s.id}>
          <span className="md-talk-name" title={s.full}>
            {s.label}
          </span>
          <span className="md-bar" role="img" aria-label={`${s.full} spoke ${s.share} percent of the words`}>
            <i style={{ width: `${s.share}%` }}></i>
          </span>
          <span className="md-talk-pct">{s.share}%</span>
        </div>
      ))}
    </section>
  );
}
