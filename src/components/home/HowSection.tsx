import type { CSSProperties } from "react";
import { InView } from "@/components/site/InView";
import { Section, SectionHead, Wrap } from "@/components/site/Section";
import s from "@/components/home/home.module.css";

/* Five steps, each icon one drawn stroke that starts and ends on the same baseline, so the five
   icons read as a single line running from talk to follow-through. They draw in turn when the
   row scrolls in; the baseline joins them after each icon finishes. On narrow screens the steps
   stack and the joining baseline is dropped. */

type Stroke = { d: string; du: string; dl: string; ink?: boolean };

const STEPS: { title: string; body: string; dl: string; strokes: Stroke[] }[] = [
  {
    title: "Capture",
    body: "Every word is captured. No bot and no recording link, just live notes that matter to your role.",
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
    title: "Label",
    body: "Decisions, action items and conflicts are labeled the moment they're said.",
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
    title: "Confirm",
    body: "Nothing is saved or assigned without your one-tap confirm. That mark is yours.",
    dl: "1s",
    strokes: [
      { d: "M0 56 H40 a25 25 0 1 0 0 -50 a25 25 0 1 0 0 50 H80", du: ".8s", dl: "1s" },
      { d: "M29 32 L37 40 L52 22", du: ".35s", dl: "1.8s", ink: true },
    ],
  },
  {
    title: "Route",
    body: "Each item goes to an owner, and to anyone who missed the meeting.",
    dl: "1.5s",
    strokes: [{ d: "M0 56 H22 C28 56 32 46 36 38 L10 30 L72 8 L36 38 L48 54 L72 8 C80 24 72 56 80 56", du: ".8s", dl: "1.5s" }],
  },
  {
    title: "Remember",
    body: "A decision on Monday becomes context your Mytes reuse on Friday.",
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
    <Section id="how" cross>
      <Wrap>
        <SectionHead
          title="From talk to follow-through, with nobody taking notes."
          lead="Conversations become decisions, action items and context, each one labeled and sent to the people who need it."
        />
        <InView as="ol" threshold={0.3} className={s.steps}>
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
              <h3 className="font-display text-[1.5rem] font-medium tracking-[-0.015em] text-ink">{step.title}</h3>
              <p className="mt-1.5 text-[15.5px] leading-normal text-ink-3">{step.body}</p>
            </li>
          ))}
        </InView>
      </Wrap>
    </Section>
  );
}
