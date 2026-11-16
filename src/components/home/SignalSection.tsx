"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle, Lightning, ListChecks, Warning } from "@phosphor-icons/react";
import s from "@/components/home/home.module.css";

/* Signal out of noise, the page's centre. A whole stretch of a meeting is set large in grey: the
   recap nobody needed, the offsite, the coffee machine. As you scroll, your Myte finds the four
   lines that matter; each one lights up in ink with a highlighter in its own colour and a tag
   saying what it is and, at the same moment, lands on the right as what it kept. On wide screens the scene pins while you scroll through it; on
   narrow ones it plays once when it comes into view. Reduced motion shows it finished. Sample
   people and lines. Nothing is saved until you confirm, which the cards say. */

type Kept = { kind: string; title: string; meta: string; tone: string; Icon: typeof CheckCircle };
const KEPT: Kept[] = [
  { kind: "Decision", title: "Q3 launch on August 12", meta: "Proposed. Confirm to save it.", tone: "bg-signal-soft text-signal-ink", Icon: CheckCircle },
  { kind: "Context", title: "QA needs two days after code freeze", meta: "From Raj's Myte, Raj is out today", tone: "bg-priority-low-soft text-priority-low", Icon: Lightning },
  { kind: "Conflict", title: "August 12 collides with the QA window", meta: "Still open", tone: "bg-priority-high-soft text-priority-high", Icon: Warning },
  { kind: "Action item", title: "Revised plan by Thursday", meta: "Owner: Diego", tone: "bg-priority-medium-soft text-priority-medium", Icon: ListChecks },
];

/* Each kept line is highlighted in its own colour (the frozen language: coral for a decision,
   blue for context, red for a conflict, amber for an action item) and tagged with what it is. The
   tag's space is always reserved, so lighting a line never reflows the paragraph. */
const KIND = [s.hlDecision, s.hlContext, s.hlConflict, s.hlAction];

function Mark({ n, lit, children }: { n: number; lit: number; children: ReactNode }) {
  const on = lit > n;
  return (
    <mark className={`${s.hlMark} ${KIND[n]} ${on ? s.hlMarkOn : ""}`}>
      <span className={s.hlText}>{children}</span>
      <span className={s.kindTag} aria-hidden={!on}>
        {KEPT[n].kind}
      </span>
    </mark>
  );
}

export function SignalSection() {
  const ref = useRef<HTMLElement>(null);
  const [lit, setLit] = useState(KEPT.length);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const wide = window.matchMedia("(min-width: 1000px)");
    let raf = 0;
    let played = false;
    let timers: number[] = [];
    setLit(0);

    const onScroll = () => {
      raf = 0;
      if (!wide.matches) return;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span > 0 ? -r.top / span : 0;
      setLit(Math.max(0, Math.min(KEPT.length, Math.floor((p - 0.1) / 0.2) + 1)));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(onScroll);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (wide.matches || played || !entries.some((e) => e.isIntersecting)) return;
        played = true;
        timers = KEPT.map((_, k) => window.setTimeout(() => setLit(k + 1), 500 + k * 900));
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    onScroll();
    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section id="signal" ref={ref} data-snap="" data-snap-label="Listening" className="relative min-[1000px]:h-[300vh]">
      {/* One snap stop per line the Myte keeps, so each snap lights the next one (wide screens). */}
      {[40, 80, 120, 160].map((vh) => (
        <span key={vh} aria-hidden data-snap-stop="" className="pointer-events-none absolute left-0 hidden h-px w-px min-[1000px]:block" style={{ top: `${vh}vh` }} />
      ))}
      <div className="min-[1000px]:sticky min-[1000px]:top-0 min-[1000px]:flex min-[1000px]:h-[100svh] min-[1000px]:items-center">
        <div className="mx-auto grid w-[min(1280px,100%-40px)] gap-x-[clamp(32px,5vw,80px)] gap-y-10 py-[clamp(64px,9vw,112px)] sm:w-[min(1280px,100%-80px)] min-[1000px]:grid-cols-[minmax(0,1fr)_340px] min-[1000px]:py-0">
          <div>
            <p className="text-[14px] font-semibold text-ink-3">
              Q3 launch sync, 41 minutes. <span className="tabular-nums text-signal-ink">{lit} of 4</span> lines kept.
            </p>
            <h2 className="display mt-2.5 text-[clamp(2rem,3.4vw,3.1rem)] leading-[1.02]">Forty minutes of talk. Four lines that matter.</h2>
            <p className={`${s.transcript} mt-[clamp(18px,2.6vw,32px)] font-display text-[clamp(1.25rem,1.8vw,1.95rem)] leading-[1.5]`}>
              <b>Maya</b> Okay, before we jump in, did everyone see the deck? <b>Diego</b> Mostly. Can we skip the recap? <b>Sarah</b> Sorry, my
              camera froze again. <b>Maya</b> Fine, no recap.{" "}
              <Mark n={0} lit={lit}>
                Let&apos;s lock the Q3 launch for August 12.
              </Mark>{" "}
              <b>Diego</b> Works for me, as long as marketing has the assets by then. <b>Raj&apos;s Myte</b> Raj is out today, but{" "}
              <Mark n={1} lit={lit}>
                QA needs two extra days after code freeze.
              </Mark>{" "}
              <b>Priya</b> Wait, then{" "}
              <Mark n={2} lit={lit}>
                the 12th collides with the QA window.
              </Mark>{" "}
              <b>Sarah</b> Can we talk about the offsite? Is it still Lisbon? <b>Diego</b> Later. Let me take the dates away.{" "}
              <Mark n={3} lit={lit}>
                I&apos;ll send a revised plan by Thursday.
              </Mark>{" "}
              <b>Maya</b> Great. And someone remind me about the coffee machine.
            </p>
          </div>

          <aside aria-label="What your Myte kept" className="rounded-hero border border-line bg-surface p-4 shadow-warm-2">
            <div className="flex items-center justify-between px-1.5 pb-3 pt-1">
              <h3 className="text-[15px] font-semibold text-ink">Your Myte kept</h3>
              <span className="text-[13px] text-ink-3">Nothing saved yet</span>
            </div>
            <ol className="grid gap-2.5">
              {KEPT.map((k, n) => (
                <li
                  key={k.kind}
                  className={`${s.kept} ${lit > n ? s.keptOn : ""} rounded-card border border-line bg-surface-2 px-4 py-3.5`}
                  aria-hidden={lit > n ? undefined : true}
                >
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-[10px] py-[3px] text-[12.5px] font-semibold ${k.tone}`}>
                    <k.Icon size={14} weight="bold" aria-hidden />
                    {k.kind}
                  </span>
                  <p className="mt-2 text-[16px] font-semibold leading-snug text-ink">{k.title}</p>
                  <p className="mt-0.5 text-[13.5px] text-ink-3">{k.meta}</p>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    </section>
  );
}
