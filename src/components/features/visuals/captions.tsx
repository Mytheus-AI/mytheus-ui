import { Chip, Live, Win, WinBar } from "@/components/site/Section";
import { Av, Demo, SWAP_IN, SWAP_OUT, Swap, dl, type Tint } from "@/components/features/atoms";

/* Live transcription: captions with speaker and time on aligned rows. The newest line is still an
   interim caption; when the window scrolls in, it settles into the final, punctuated line, which
   is the only version that is stored. */

const LINES: { time: string; name: string; tint: Tint; text: string; hover?: boolean }[] = [
  { time: "10:14:02", name: "Maya", tint: "peach", text: "Can we still hit the April launch if pricing slips?" },
  { time: "10:14:09", name: "Diego", tint: "ochre", text: "Only if legal signs off on the new terms this week.", hover: true },
];

const ROW = "grid grid-cols-[30px_minmax(0,1fr)] gap-x-3 px-[22px] py-3.5 sm:grid-cols-[76px_30px_minmax(0,1fr)]";

export function CaptionsVisual() {
  return (
    <Win
      className="mx-auto max-w-[920px]"
      label="Live captions for a launch review, each line with its speaker and time. Maya asks whether the April launch holds if pricing slips. Diego says only if legal signs off this week. Sarah's line arrives as an interim caption and settles into: Okay. Lock the price at $49, and I'll own the rework."
    >
      <WinBar title="Launch review" meta={<Live>Live, captions on</Live>} right={<Chip>Under 2s behind speech</Chip>} />
      <Demo className="py-2">
        {LINES.map((l) => (
          <div key={l.time} className={`${ROW} ${l.hover ? "bg-surface-2" : ""}`}>
            <span className="hidden pt-0.5 text-[14px] tabular-nums text-ink-3 sm:block">{l.time}</span>
            <Av name={l.name} tint={l.tint} />
            <div className="min-w-0">
              <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[15px] font-semibold text-ink">
                {l.name}
                {l.hover ? <span className="text-[13px] font-semibold text-signal-ink">Jump to this moment</span> : null}
              </p>
              <p className="mt-0.5 text-[1.06rem] leading-[1.45] text-ink-2">{l.text}</p>
            </div>
          </div>
        ))}
        <div className={ROW}>
          <span className="hidden pt-0.5 text-[14px] tabular-nums text-ink-3 sm:block">10:14:15</span>
          <span className="rounded-full shadow-[0_0_0_2.5px_var(--signal-line)]">
            <Av name="Sarah" tint="sage" />
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-baseline gap-x-2.5 text-[15px] font-semibold text-ink">
              Sarah
              <Swap className="text-[13px] font-semibold">
                <span style={dl(1.4)} className={`text-ink-3 ${SWAP_OUT}`}>
                  Interim
                </span>
                <span style={dl(1.4)} className={`text-ok ${SWAP_IN}`}>
                  Final
                </span>
              </Swap>
            </p>
            <Swap className="mt-0.5 text-[1.06rem] leading-[1.45]">
              <span style={dl(1.4)} className={`italic text-ink-3 ${SWAP_OUT}`}>
                okay lock the price at forty nine and I&rsquo;ll
              </span>
              <span style={dl(1.4)} className={`text-ink ${SWAP_IN}`}>
                Okay. Lock the price at $49, and I&rsquo;ll own the rework.
              </span>
            </Swap>
          </div>
        </div>
      </Demo>
      <div className="border-t border-line bg-surface-2 px-[22px] py-3.5 text-[14px] text-ink-3">
        Interim lines refine as speech settles. Only the final transcript is stored.
      </div>
    </Win>
  );
}
