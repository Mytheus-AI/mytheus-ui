import type { ReactNode } from "react";
import { Chip, Live, Win, WinBar } from "@/components/site/Section";
import { APPEAR, Av, Demo, PanelLabel, SWAP_IN, SWAP_OUT, Swap, TIMED, dl, type Tint } from "@/components/features/atoms";

/* Proactive insights: the team's load this sprint, with the 80% heads-up and 95% red-flag lines
   marked. Maya proposes giving Sarah one more piece of work; when the window scrolls in, Sarah's
   bar grows past the red line and the act-now warning arrives. A missing-stakeholder note sits
   beside it. Bars follow the frozen tones: amber past 80%, red past 95%. */

const TEAM: { name: string; tint: Tint; load: number }[] = [
  { name: "Priya", tint: "sage", load: 88 },
  { name: "Raj", tint: "sky", load: 74 },
  { name: "Diego", tint: "ochre", load: 45 },
];

function Bar({ load }: { load: number }) {
  const tone = load > 95 ? "bg-priority-high" : load >= 80 ? "bg-priority-medium" : "bg-ink-4";
  return <span className={`absolute inset-y-0 left-0 rounded-full ${tone}`} style={{ width: `${load}%` }} />;
}

function Track({ children }: { children: ReactNode }) {
  return (
    <span className="relative h-2.5 rounded-full bg-bg-2">
      {children}
      <span aria-hidden className="absolute -inset-y-1.5 left-[80%] w-px bg-ink-4" />
      <span aria-hidden className="absolute -inset-y-1.5 left-[95%] w-px bg-priority-high" />
    </span>
  );
}

const ROW = "grid grid-cols-[30px_64px_minmax(0,1fr)_44px] items-center gap-x-3 py-2.5";

export function CapacityVisual() {
  return (
    <Win
      className="mx-auto max-w-[960px]"
      label="Sprint 14 planning. Maya proposes giving Sarah the onboarding flow. Sarah's load would rise from 84 to 96 percent, past the 95 percent line, and your Myte raises an act-now warning. Priya is at 88 percent, Raj 74, Diego 45. A second note says Aiko owns onboarding and is not in this meeting."
    >
      <WinBar title="Sprint 14 planning" meta={<Live>Live, 10:40</Live>} />
      <div className="border-b border-line px-[22px] py-5">
        <div className="grid grid-cols-[30px_minmax(0,1fr)] gap-x-3">
          <Av name="Maya" />
          <p className="font-display text-[1.2rem]  leading-[1.3] text-ink-2">
            &ldquo;Sarah can pick up the onboarding flow too.&rdquo;
          </p>
        </div>
      </div>
      <Demo className="grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <div className="px-[22px] py-5">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <PanelLabel className="!mb-0">Load this sprint</PanelLabel>
            <span className="text-[13px] text-ink-3">Lines at 80% and 95%</span>
          </div>
          <div className={ROW}>
            <Av name="Sarah" tint="peach" />
            <span className="text-[15px] font-semibold text-ink">Sarah</span>
            <Track>
              <span className="absolute inset-y-0 left-0 w-[84%] rounded-full bg-priority-medium" />
              <span
                style={dl(0.5)}
                className={`absolute inset-y-0 left-[84%] w-[12%] origin-left rounded-r-full bg-priority-high motion-safe:scale-x-0 group-[.in]:scale-x-100 motion-safe:transition-transform motion-safe:duration-700 ${TIMED}`}
              />
            </Track>
            <Swap className="justify-items-end text-[15px] font-semibold tabular-nums">
              <span style={dl(0.9)} className={`text-priority-medium ${SWAP_OUT}`}>
                84%
              </span>
              <span style={dl(0.9)} className={`text-priority-high ${SWAP_IN}`}>
                96%
              </span>
            </Swap>
          </div>
          {TEAM.map((t) => (
            <div key={t.name} className={ROW}>
              <Av name={t.name} tint={t.tint} />
              <span className="text-[15px] text-ink-2">{t.name}</span>
              <Track>
                <Bar load={t.load} />
              </Track>
              <span className={`text-right text-[15px] tabular-nums ${t.load >= 80 ? "font-semibold text-priority-medium" : "text-ink-3"}`}>
                {t.load}%
              </span>
            </div>
          ))}
        </div>
        <div className="grid content-start gap-2.5 border-t border-line bg-surface-2 px-[18px] py-5 md:border-l md:border-t-0">
          <PanelLabel className="!mb-1">Your Myte flags</PanelLabel>
          <div style={dl(1.1)} className={`rounded-[14px] border border-line bg-surface px-4 py-3.5 ${APPEAR}`}>
            <Chip tone="high">Act now</Chip>
            <p className="mt-2 font-semibold leading-[1.35] text-ink">Sarah would be at 96% with the onboarding flow.</p>
            <p className="mt-1 text-[14px] text-ink-3">That is past the 95% line for this sprint.</p>
          </div>
          <div className="rounded-[14px] border border-line bg-surface px-4 py-3.5">
            <Chip tone="medium">Missing stakeholder</Chip>
            <p className="mt-2 font-semibold leading-[1.35] text-ink">Aiko owns onboarding and is not in this meeting.</p>
          </div>
        </div>
      </Demo>
    </Win>
  );
}
