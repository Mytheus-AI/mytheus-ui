import type { CSSProperties } from "react";
import { InView } from "@/components/site/InView";
import { SectionHead } from "@/components/site/Section";
import s from "@/components/home/home.module.css";

/* From talk to follow-through: five steps, each icon one drawn coral stroke that starts and ends
   on the same baseline, so the five read as a single line running across the screen from the
   first word of a meeting to the week after it. They draw in turn when the row scrolls in; the
   baseline joins each icon to the next once it has finished. Brought back from the previous
   home page (`a211ac3`), set full screen for the snap. On narrow screens the steps stack and the
   joining baseline is dropped. Reduced motion shows the line drawn. */

type Stroke = { d: string; du: string; dl: string; ink?: boolean };

const STEPS: { n: string; title: string; body: string; dl: string; strokes: Stroke[] }[] = [
  {
    n: "01",
    title: "Capture",
    body: "Every word is caught as it is said. No bot joins and no recording link goes round.",
    dl: "0s",
    strokes: [
      {
        d: "M0 56 H28 L24 45 C12 43 6 36 6 27 C6 14 20 6 40 6 C60 6 74 14 74 27 C74 38 62 46 44 46 H34 L28 56 H80",
        du: ".8s",
        dl: "0s",
      },
    ],
  },
  {
    n: "02",
    title: "Label",
    body: "Decisions, action items and conflicts are labelled the moment they come up.",
    dl: ".5s",
    strokes: [
      {
        d: "M0 56 H56 Q60 56 60 52 V30 L42 8 Q40 6 38 8 L20 30 V52 Q20 56 24 56 H40 V29 a5 5 0 1 0 0 -10 a5 5 0 1 0 0 10 V56 H80",
        du: ".8s",
        dl: ".5s",
      },
    ],
  },
  {
    n: "03",
    title: "Confirm",
    body: "Nothing is saved or assigned until you tap Confirm. That mark is yours.",
    dl: "1s",
    strokes: [
      { d: "M0 56 H40 a25 25 0 1 0 0 -50 a25 25 0 1 0 0 50 H80", du: ".8s", dl: "1s" },
      { d: "M29 32 L37 40 L52 22", du: ".35s", dl: "1.8s", ink: true },
    ],
  },
  {
    n: "04",
    title: "Route",
    body: "Each item goes to its owner, and to anyone who missed the meeting.",
    dl: "1.5s",
    strokes: [{ d: "M0 56 H22 C28 56 32 46 36 38 L10 30 L72 8 L36 38 L48 54 L72 8 C80 24 72 56 80 56", du: ".8s", dl: "1.5s" }],
  },
  {
    n: "05",
    title: "Remember",
    body: "A decision on Monday is the context your Mytes bring to Friday.",
    dl: "2s",
    strokes: [
      {
        d: "M0 56 H40 a25 25 0 1 0 0 -50 a25 25 0 1 0 0 50 a16 16 0 1 0 0 -32 a16 16 0 1 0 0 32 H80",
        du: ".9s",
        dl: "2s",
      },
    ],
  },
];

const vars = (v: Record<string, string>) => v as CSSProperties;

export function HowSection() {
  return (
    <section
      id="how"
      data-snap=""
      data-snap-label="How it works"
      className="py-[clamp(72px,10vw,136px)] min-[1000px]:flex min-[1000px]:min-h-[100svh] min-[1000px]:flex-col min-[1000px]:justify-center"
    >
      <div className="mx-auto w-[min(1280px,100%-40px)] sm:w-[min(1280px,100%-80px)]">
        <div data-snap-in="">
          <SectionHead
            title="From talk to follow-through, with nobody taking notes."
            lead="Conversations become decisions, action items and context, each one labelled and sent to the people who need it."
          />
        </div>
        <InView as="ol" threshold={0.3} data-snap-in="" style={vars({ "--si": "2" })} className={`${s.steps} mt-[clamp(8px,2vw,24px)]`}>
          {STEPS.map((step) => (
            <li key={step.title} className={s.step} style={vars({ "--dl": step.dl })}>
              <div className={s.stepIco}>
                <svg viewBox="0 0 80 64" aria-hidden>
                  {step.strokes.map((k) => (
                    <path
                      key={k.d}
                      className="line-stroke line-draw"
                      pathLength={1}
                      d={k.d}
                      style={vars({ "--du": k.du, "--dl": k.dl, ...(k.ink ? { stroke: "var(--ink)" } : {}) })}
                    />
                  ))}
                </svg>
              </div>
              <div>
                <p className="font-display text-[1.05rem] tabular-nums text-signal-ink">{step.n}</p>
                <h3 className="mt-1 font-display text-[clamp(1.5rem,2vw,1.85rem)] font-medium leading-tight tracking-[-0.015em] text-ink">{step.title}</h3>
                <p className="mt-2 text-[15.5px] leading-relaxed text-ink-3">{step.body}</p>
              </div>
            </li>
          ))}
        </InView>
      </div>
    </section>
  );
}
