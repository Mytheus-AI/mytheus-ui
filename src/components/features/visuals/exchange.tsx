import { Chip, Live, Win, WinBar } from "@/components/site/Section";
import { APPEAR, AgentAv, Av, Demo, PanelLabel, dl } from "@/components/features/atoms";

/* Cross-meeting answers: the room mentions a call you were not in, your Myte asks Sarah's Myte,
   and the answer comes back with its source. When it scrolls in, the line between the two agents
   draws and the answer arrives. */

export function ExchangeVisual() {
  return (
    <Win
      className="mx-auto max-w-[920px]"
      label="A live pricing review. Diego mentions what was agreed on the pricing call, which you missed. Your Myte asks Sarah's Myte who owns the pricing rework. Sarah's Myte answers that pricing was locked at $49 in the Q2 planning call and Sarah owns the rework, sourced from Q2 planning on April 3."
    >
      <WinBar title="Pricing review" meta={<Live>Live, 15:06</Live>} right={<Chip>You missed: Q2 planning</Chip>} />
      <div className="border-b border-line px-[22px] py-5">
        <PanelLabel>Said in the room</PanelLabel>
        <div className="grid grid-cols-[30px_minmax(0,1fr)] gap-x-3">
          <Av name="Diego" tint="ochre" />
          <p className="font-display text-[1.2rem]  leading-[1.3] text-ink-2">
            &ldquo;As we agreed on the pricing call, the rework is already owned.&rdquo;
          </p>
        </div>
      </div>
      <Demo className="bg-surface-2 px-[22px] pb-6 pt-5">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-3">
          <span className="grid justify-items-center gap-1.5">
            <AgentAv size={44} />
            <span className="font-display text-[1.02rem]  text-ink-3">your Myte</span>
          </span>
          <svg aria-hidden viewBox="0 0 400 48" preserveAspectRatio="none" className="mb-[50px] h-12 w-full overflow-visible">
            <path
              className="line-stroke line-draw"
              pathLength={1}
              vectorEffect="non-scaling-stroke"
              style={{ strokeWidth: 2.6, ["--du" as string]: ".9s", ["--dl" as string]: ".2s" }}
              d="M2 44 C 70 4, 330 4, 398 44"
            />
          </svg>
          <span className="grid justify-items-center gap-1.5">
            <AgentAv size={44} />
            <span className="whitespace-nowrap font-display text-[1.02rem]  text-ink-3">Sarah&rsquo;s Myte</span>
          </span>
        </div>
        <div className="mt-5 grid items-start gap-3.5 sm:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
          <div className="rounded-card border border-line bg-surface px-5 py-4 shadow-warm-2">
            <p className="text-[14px] font-semibold text-ink-3">Your Myte asks</p>
            <p className="mt-1.5 font-display text-[1.3rem] leading-[1.25] tracking-[-0.01em] text-ink">Who owns the pricing rework?</p>
          </div>
          <div style={dl(1.15)} className={`rounded-card border border-line bg-surface px-5 py-4 shadow-warm-2 ${APPEAR}`}>
            <p className="text-[14px] font-semibold text-ink-3">Sarah&rsquo;s Myte answers</p>
            <p className="mt-1.5 font-display text-[1.3rem] leading-[1.25] tracking-[-0.01em] text-ink">
              Pricing was locked at $49 in the Q2 planning call. Sarah already owns the rework.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip tone="ok">Sourced from Q2 planning, April 3</Chip>
              <Chip>Said by Sarah</Chip>
            </div>
          </div>
        </div>
      </Demo>
    </Win>
  );
}
