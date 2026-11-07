import { resolveSpeaker, wordCount } from "@/components/meetings/transcript-utils";
import type { MeetingSpeaker, TranscriptChunk } from "@/lib/api/transcript";

/* Talk time in the meeting design's panel. Share of words per speaker, counted from the
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
    <div className="panel reveal tx-talk" style={{ animationDelay: ".2s" }}>
      <div className="panel-head">
        <h2>Talk time</h2>
      </div>
      <div className="panel-body">
        {rows.map((s) => (
          <div className="speaker-row" key={s.id}>
            <span className="speaker-name" title={s.full}>
              {s.label}
            </span>
            <span
              className="meter"
              role="img"
              aria-label={`${s.full} spoke ${s.share} percent of the words`}
            >
              <i style={{ width: `${s.share}%` }}></i>
            </span>
            <span className="speaker-share">{s.share}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
