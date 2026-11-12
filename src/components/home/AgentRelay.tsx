"use client";

import { useEffect, useRef, useState } from "react";
import { MARK_PATH } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { InView } from "@/components/site/InView";
import { Chip } from "@/components/site/Section";
import s from "@/components/home/home.module.css";

/* Two agents, each drawn as the brand mark on its own paper disc, joined by one coral arc from
   the tail of one mark to the tail of the other. When it scrolls in, a dot carries the question
   along the arc and down into Sarah's Myte, then the answer arrives with its source. "Ask again"
   replays it. Reduced motion (and no JS) shows the answer straight away. */

/* The marks are MARK_PATH at a quarter scale: left at translate(20 25), right mirrored at x=620.
   Their tails end at (213.75, 34.5) and (426.25, 34.5); the arc joins exactly those points. */
const JOIN = "M213.75 34.5 C223 18 262 6 320 6 S417 18 426.25 34.5";
const FLIGHT = `${JOIN} C432 47.5 438.75 73.75 445 93.75 C450 110 453.75 118 458 113`;

type Phase = "static" | "idle" | "flying" | "answered";

export function AgentRelay() {
  const [phase, setPhase] = useState<Phase>("static");
  const [flown, setFlown] = useState(false);
  const fly = useRef<SVGElement>(null);
  const timer = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPhase(reduce ? "answered" : "idle");
    const t = timer;
    return () => window.clearTimeout(t.current);
  }, []);

  const ask = () => {
    window.clearTimeout(timer.current);
    const motion = fly.current as SVGAnimationElement | null;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !motion || typeof motion.beginElement !== "function") {
      setPhase("answered");
      return;
    }
    setPhase("flying");
    setFlown(true);
    try {
      motion.beginElement();
    } catch {
      setPhase("answered");
      return;
    }
    timer.current = window.setTimeout(() => setPhase("answered"), 1500);
  };

  const answered = phase === "static" || phase === "answered";

  return (
    <InView
      threshold={0.3}
      onEnter={() => {
        if (phase === "static" || phase === "idle") ask();
      }}
      className={`mx-auto max-w-[880px] ${flown ? s.flying : ""} ${answered ? s.answered : ""}`}
    >
      <svg viewBox="0 0 640 150" role="img" aria-label="Your Myte and Sarah's Myte, joined by one line" className="h-auto w-full overflow-visible">
        <circle className={s.disc} cx={68} cy={76} r={60} />
        <circle className={s.discB} cx={572} cy={76} r={60} />
        <path className={s.mark} d={MARK_PATH} transform="translate(20 25) scale(.25)" />
        <path className={s.mark} d={MARK_PATH} transform="translate(620 25) scale(-.25 .25)" />
        <path
          className={`line-stroke line-draw ${s.join}`}
          pathLength={1}
          style={{ ["--du" as string]: ".9s", ["--dl" as string]: ".2s" }}
          d={JOIN}
        />
        <circle className={s.dot} r={6}>
          <animateMotion
            ref={fly}
            dur="1.5s"
            begin="indefinite"
            fill="freeze"
            calcMode="spline"
            keyTimes="0;1"
            keySplines=".45 0 .3 1"
            path={FLIGHT}
          />
        </circle>
      </svg>
      <div className="mt-1.5 flex justify-between font-display text-[1.1rem] italic text-ink-3">
        <span>your Myte</span>
        <span>Sarah&apos;s Myte</span>
      </div>
      <div className="mt-[22px] grid items-start gap-[18px] min-[641px]:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
        <div className="rounded-card border border-line bg-surface px-5 py-[18px] shadow-warm-2">
          <h3 className="mb-1.5 text-[14.5px] font-semibold text-ink-3">Your Myte asks</h3>
          <p className="font-display text-[1.3rem] leading-[1.25] tracking-[-0.01em] text-ink">Who owns the pricing rework?</p>
        </div>
        <div className={`${s.answer} rounded-card border border-line bg-surface px-5 py-[18px] shadow-warm-2`}>
          <h3 className="mb-1.5 text-[14.5px] font-semibold text-ink-3">Sarah&apos;s Myte answers</h3>
          <p className="font-display text-[1.3rem] leading-[1.25] tracking-[-0.01em] text-ink">
            Pricing was locked at $49 in the Q2 planning call. Sarah already owns the rework.
          </p>
          <Chip tone="ok" className="mt-3">
            Sourced from Q2 planning, April 3
          </Chip>
        </div>
      </div>
      <p className="mt-[22px] text-center">
        <Button type="button" variant="outline" onClick={ask}>
          Ask again
        </Button>
      </p>
    </InView>
  );
}
