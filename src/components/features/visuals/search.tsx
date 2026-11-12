import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { Chip, Win, WinBar } from "@/components/site/Section";
import { APPEAR, Av, Demo, PanelLabel, dl, type Tint } from "@/components/features/atoms";

/* Meeting search: a plain-language question, a short answer with numbered citations, and the
   sources as aligned rows (meeting, time, speaker, the exact line). When the window scrolls in,
   the answer arrives. */

const SOURCES: { n: number; meeting: string; when: string; name: string; tint: Tint; quote: string; tone: "accent" | "medium"; kind: string }[] = [
  {
    n: 1,
    meeting: "Q3 planning",
    when: "Jun 12, 11:04",
    name: "Maya",
    tint: "peach",
    quote: "Okay, let's lock pricing at $49 for Q3 and move on.",
    tone: "accent",
    kind: "Decision",
  },
  {
    n: 2,
    meeting: "Pricing review",
    when: "Jun 14, 15:21",
    name: "Sarah",
    tint: "sage",
    quote: "I'll take the pricing page rework.",
    tone: "medium",
    kind: "Next step",
  },
];

function Cite({ n }: { n: number }) {
  return (
    <span className="ml-1 inline-grid h-[22px] min-w-[22px] -translate-y-[3px] place-items-center rounded-full bg-signal-soft px-1 align-middle font-sans text-[12.5px] font-bold not-italic text-signal-ink">
      {n}
    </span>
  );
}

export function SearchVisual() {
  return (
    <Win
      className="mx-auto max-w-[920px]"
      label="Search across your meetings. The question: what did we agree on pricing? The answer: pricing was locked at $49 for Q3, and Sarah owns the pricing page rework, citing Maya in Q3 planning on June 12 and Sarah in the pricing review on June 14."
    >
      <WinBar title="Search" meta="Your meetings and your team's shared record" />
      <Demo className="px-[22px] pb-6 pt-5">
        <div className="flex items-center gap-3 rounded-ctl border border-line-2 bg-surface px-4 py-3">
          <MagnifyingGlass size={19} aria-hidden className="flex-none text-ink-3" />
          <span className="min-w-0 truncate text-[1.04rem] text-ink">what did we agree on pricing?</span>
        </div>
        <div style={dl(0.7)} className={`mt-5 ${APPEAR}`}>
          <PanelLabel className="!mb-1.5">Answer</PanelLabel>
          <p className="max-w-[46ch] font-display text-[clamp(1.3rem,2.2vw,1.55rem)] leading-[1.25] tracking-[-0.01em] text-ink">
            Pricing was locked at $49 for Q3.
            <Cite n={1} /> Sarah owns the rework of the pricing page.
            <Cite n={2} />
          </p>
        </div>
        <PanelLabel className="!mb-0 mt-6">Sources</PanelLabel>
        <ul className="mt-2">
          {SOURCES.map((s) => (
            <li
              key={s.n}
              className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-3 border-t border-line py-3.5 md:grid-cols-[22px_170px_minmax(0,1fr)_auto] md:items-center md:gap-x-4"
            >
              <span className="mt-0.5 grid h-[22px] w-[22px] place-items-center rounded-full bg-signal-soft text-[12.5px] font-bold text-signal-ink md:mt-0">
                {s.n}
              </span>
              <div>
                <p className="font-semibold text-ink">{s.meeting}</p>
                <p className="text-[14px] text-ink-3">{s.when}</p>
              </div>
              <div className="col-start-2 mt-2 flex items-start gap-2.5 md:col-start-3 md:mt-0">
                <Av name={s.name} tint={s.tint} size={26} />
                <p className="font-display text-[1.08rem] italic leading-[1.35] text-ink-2">&ldquo;{s.quote}&rdquo;</p>
              </div>
              <span className="col-start-2 mt-2 md:col-start-4 md:mt-0">
                <Chip tone={s.tone}>{s.kind}</Chip>
              </span>
            </li>
          ))}
        </ul>
      </Demo>
    </Win>
  );
}
