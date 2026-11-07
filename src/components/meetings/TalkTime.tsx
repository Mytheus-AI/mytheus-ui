import type { MeetingSpeaker, TranscriptChunk } from "@/lib/api/transcript";
import { resolveSpeaker, wordCount } from "./transcript-utils";

/* Share of words spoken per speaker, counted from the transcript lines themselves. It uses the
   same label resolution as the reader, so an unmatched voice stays "Speaker N" here too. */
export function TalkTime({
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
        n,
        label: who.named ? who.label.split(" ")[0] : who.label,
        full: who.label,
        pct: (n / all) * 100,
      };
    });

  return (
    <section className="rounded-card border border-line bg-surface p-5" aria-label="Talk time">
      <h2 className="mb-2.5 text-[15px] font-semibold text-ink">Talk time</h2>
      <ul>
        {rows.map((r) => (
          <li key={r.id} className="grid grid-cols-[84px_minmax(0,1fr)_40px] items-center gap-2.5 py-1.5 text-[13px]">
            <span className="truncate font-semibold text-ink-2" title={r.full}>
              {r.label}
            </span>
            <span
              role="img"
              aria-label={`${r.pct.toFixed(1)} percent of words`}
              className="h-2 overflow-hidden rounded-full bg-bg-2"
            >
              <span
                className="block h-full rounded-full bg-signal-deep"
                style={{ width: `${r.pct.toFixed(1)}%` }}
              />
            </span>
            <span className="text-right font-semibold text-ink-3">{r.pct.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
