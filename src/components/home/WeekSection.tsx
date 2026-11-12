import type { CSSProperties } from "react";
import { InView } from "@/components/site/InView";
import { Chip, Section, SectionHead, Wrap } from "@/components/site/Section";
import s from "@/components/home/home.module.css";

/* One week of meetings. Each early meeting drops a strand from under its card; the strands run
   along beneath the row, braid, and rise into Friday, which arrives with all three already
   remembered. Below 900px the cards stack and the strands become a rail down their left edge,
   one strand joining at each day and all three closing under Friday. */

const DAYS = [
  { when: "Monday", title: "Roadmap sync", kept: "Ship date locked" },
  { when: "Wednesday", title: "Pricing review", kept: "Trial extended to 21 days" },
  { when: "Thursday", title: "Customer call", kept: "SSO promised" },
];

const STRANDS = [
  {
    d: "M118 0 C118 26 146 40 186 40 H690 C706 40 714 76 730 76 S754 40 770 40 S794 76 810 76 S834 58 850 58",
    du: "1.6s",
    dl: ".1s",
  },
  {
    d: "M372 0 C372 36 400 58 436 58 H690 C706 58 714 40 730 40 S754 76 770 76 S794 40 810 40 S834 58 850 58",
    du: "1.3s",
    dl: ".5s",
  },
  { d: "M628 0 C628 46 650 76 682 76 H690 C706 76 714 58 730 58 H850", du: "1s", dl: ".9s" },
  { d: "M850 58 C868 58 882 40 882 0", du: ".5s", dl: "1.9s" },
];

const card = "flex-1 rounded-card border border-line bg-surface px-5 py-[18px] shadow-warm-2";
const when = "font-display text-[1.05rem] italic text-ink-3";
const title = "mb-3 mt-0.5 font-display text-[1.4rem] font-medium tracking-[-0.015em] text-ink";

export function WeekSection() {
  return (
    <Section id="memory" cross>
      <Wrap>
        <SectionHead
          title="A decision on Monday is context on Friday."
          lead="Every meeting adds a strand to one shared memory. What gets decided and promised early in the week carries forward, so by Friday's standup nothing has to be explained twice."
        />
        <InView threshold={0.3}>
          <ol className={s.week}>
            {DAYS.map((d) => (
              <li key={d.when} className={s.day}>
                <span aria-hidden className={s.rail} />
                <div className={card}>
                  <span className={when}>{d.when}</span>
                  <h3 className={title}>{d.title}</h3>
                  <p className="flex items-center gap-[9px] font-semibold leading-[1.3] text-ink before:h-[9px] before:w-[9px] before:flex-none before:rounded-full before:bg-signal-line before:content-['']">
                    {d.kept}
                  </p>
                </div>
              </li>
            ))}
            <li className={s.day}>
              <span aria-hidden className={s.rail} />
              <div className={card}>
                <span className={when}>Friday</span>
                <h3 className={title}>Standup</h3>
                <p className="leading-[1.45] text-ink-2">Everything from the week arrives already remembered.</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Chip tone="accent">Ship date</Chip>
                  <Chip tone="accent">21-day trial</Chip>
                  <Chip tone="accent">SSO promise</Chip>
                </div>
              </div>
            </li>
          </ol>
          <svg className={s.strands} viewBox="0 0 1000 96" aria-hidden>
            {STRANDS.map((k) => (
              <path
                key={k.d}
                className="line-stroke line-draw"
                pathLength={1}
                d={k.d}
                style={{ ["--du" as string]: k.du, ["--dl" as string]: k.dl } as CSSProperties}
              />
            ))}
            {[118, 372, 628, 882].map((cx) => (
              <circle key={cx} cx={cx} cy={2} r={4.5} />
            ))}
          </svg>
        </InView>
      </Wrap>
    </Section>
  );
}
