import { Chip, Win, WinBar } from "@/components/site/Section";
import { APPEAR, Av, Avs, Demo, TIMED, dl } from "@/components/features/atoms";

/* Live notes: what you typed on the left, what your Myte wrote on the right, joined by one
   straight thread with a bead per row. When it scrolls in, the thread fills top to bottom and each
   row's clean note appears as the line reaches it. */

type Tone = "accent" | "low" | "medium";
const ROWS: { raw: string; tone: Tone; kind: string; text: string; meta?: string }[] = [
  { raw: "confirm ICP alignment", tone: "accent", kind: "Decision", text: "ICP alignment is confirmed for Q3." },
  { raw: "deal stalls, need sales input??", tone: "low", kind: "Open question", text: "Why are deals stalling? Sales to weigh in." },
  { raw: "Q3 messaging rollout, teams ready??", tone: "low", kind: "Open question", text: "Are teams ready for the Q3 messaging rollout?" },
  {
    raw: "pricing page = blocker, follow up tues",
    tone: "medium",
    kind: "Next step",
    text: "Fix the pricing page. It is blocking launch.",
    meta: "Owner: Maya, due Tuesday",
  },
];

const LINE_POS =
  "absolute left-[5.5px] top-6 bottom-0 w-0.5 rounded-full md:bottom-[34px] md:left-[calc((100%-48px)*0.36+23px)] md:top-[34px]";

export function NotesVisual() {
  return (
    <Win
      className="mx-auto max-w-[920px]"
      label="Notes from a Q3 go-to-market sync. Four rough jottings become clean notes: a confirmed decision, two open questions, and a next step owned by Maya, due Tuesday."
    >
      <WinBar
        title="Q3 GTM sync"
        meta="Today, 14:31"
        right={
          <Avs>
            <Av name="Maya" />
            <Av name="Raj" tint="sky" />
            <Av name="Priya" tint="sage" />
          </Avs>
        }
      />
      <Demo className="px-[clamp(16px,3vw,30px)] pb-3.5 pt-3.5 md:pt-1.5">
        <div className="hidden grid-cols-[minmax(0,.72fr)_48px_minmax(0,1.28fr)] pb-1 pt-[18px] text-[14px] font-semibold text-ink-3 md:grid">
          <span className="text-right">What you typed</span>
          <span />
          <span>What your Myte wrote</span>
        </div>
        <div className="relative">
          <span aria-hidden className={`${LINE_POS} bg-line-2`} />
          <span
            aria-hidden
            style={dl(0.15)}
            className={`${LINE_POS} origin-top bg-signal-line motion-safe:scale-y-0 group-[.in]:scale-y-100 motion-safe:transition-transform motion-safe:duration-[2300ms] ${TIMED} motion-safe:!ease-linear`}
          />
          {ROWS.map((r, i) => {
            const last = i === ROWS.length - 1;
            const at = 0.2 + i * 0.66;
            return (
              <div
                key={r.raw}
                className={`relative grid grid-cols-[30px_minmax(0,1fr)] items-start py-[13px] md:grid-cols-[minmax(0,.72fr)_48px_minmax(0,1.28fr)] md:items-center md:py-[17px] ${last ? "max-md:overflow-hidden" : ""}`}
              >
                <p className="col-start-2 font-display text-[1.1rem]  leading-[1.3] text-ink-3 md:col-start-1 md:row-start-1 md:text-right md:text-[1.24rem]">
                  {r.raw}
                </p>
                <span className="relative z-[1] col-start-1 row-span-2 row-start-1 mt-[7px] justify-self-start md:col-start-2 md:row-span-1 md:mt-0 md:justify-self-center">
                  <span
                    style={dl(at)}
                    className={`block h-[13px] w-[13px] rounded-full border-2 border-line-2 bg-surface group-[.in]:border-signal-line group-[.in]:bg-signal-line group-[.in]:shadow-[0_0_0_5px_var(--signal-soft)] motion-reduce:border-signal-line motion-reduce:bg-signal-line motion-safe:transition-[background-color,border-color,box-shadow] motion-safe:duration-300 ${TIMED}`}
                  />
                  {last ? <span className="absolute left-[-2px] top-[15px] h-[400px] w-[17px] bg-surface md:hidden" /> : null}
                </span>
                <div style={dl(at)} className={`col-start-2 mt-2 md:col-start-3 md:row-start-1 md:mt-0 ${APPEAR}`}>
                  <Chip tone={r.tone}>{r.kind}</Chip>
                  <p className="mt-[5px] text-[1.05rem] font-medium leading-[1.35] text-ink md:text-[1.1rem]">{r.text}</p>
                  {r.meta ? <p className="mt-[3px] text-[14px] text-ink-3">{r.meta}</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </Demo>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-2 px-[22px] py-3.5">
        <p className="text-[14px] text-ink-3">4 jottings, written up as notes for your role.</p>
        <Chip tone="accent">Private until you share</Chip>
      </div>
    </Win>
  );
}
