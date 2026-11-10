"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { InView } from "@/components/site/InView";
import { Chip, Win, WinBar } from "@/components/site/Section";
import { AvStack } from "@/components/home/Tangle";
import s from "@/components/home/home.module.css";

/* The notes window: what you typed on the left, what your agent wrote on the right, aligned row
   by row and joined by one vertical thread. Generating runs the thread down and fills each bead
   as its note appears. It runs once by itself when the window scrolls in; the button runs it
   again. Before hydration (and without JS) the finished notes are shown. */

type Tone = "accent" | "low" | "medium";

const ROWS: { raw: string; tone: Tone; label: string; clean: string; meta?: string }[] = [
  { raw: "confirm ICP alignment", tone: "accent", label: "Decision", clean: "ICP alignment is confirmed for Q3." },
  { raw: "deal stalls, need sales input??", tone: "low", label: "Open question", clean: "Why are deals stalling? Sales to weigh in." },
  {
    raw: "Q3 messaging rollout, teams ready??",
    tone: "low",
    label: "Open question",
    clean: "Are teams ready for the Q3 messaging rollout?",
  },
  {
    raw: "pricing page = blocker, follow up tues",
    tone: "medium",
    label: "Next step",
    clean: "Fix the pricing page. It is blocking launch.",
    meta: "Owner: Maya, due Tuesday",
  },
];

type Phase = "static" | "idle" | "running" | "done";

const STATUS: Record<Phase, string> = {
  static: "Notes generated. Ready to share.",
  idle: `${ROWS.length} jottings, as typed.`,
  running: "Reading your notes.",
  done: "Notes generated. Ready to share.",
};

export function NotesWindow() {
  const [phase, setPhase] = useState<Phase>("static");
  const [shown, setShown] = useState(0);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  useEffect(() => {
    setPhase("idle");
    const pending = timers;
    return () => pending.current.forEach((id) => window.clearTimeout(id));
  }, []);

  const generate = () => {
    clear();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setShown(0);
    setPhase("running");
    ROWS.forEach((_, i) => {
      timers.current.push(window.setTimeout(() => setShown(i + 1), reduce ? 0 : 260 + i * 600));
    });
    timers.current.push(window.setTimeout(() => setPhase("done"), reduce ? 0 : 400 + ROWS.length * 600));
  };

  const onButton = () => {
    if (phase === "done") {
      clear();
      setShown(0);
      setPhase("idle");
    } else {
      generate();
    }
  };

  const isStatic = phase === "static";
  const run = phase !== "idle";

  return (
    <Win className="mx-auto max-w-[920px]">
      <WinBar
        title="Q3 GTM sync"
        meta="Today, 14:31"
        right={
          <AvStack
            label="Maya, Raj and Priya"
            people={[
              { tone: "peach", initial: "M" },
              { tone: "sky", initial: "R" },
              { tone: "sage", initial: "P" },
            ]}
          />
        }
      />
      <InView
        threshold={0.22}
        onEnter={() => {
          if (phase === "static" || phase === "idle") generate();
        }}
        className={`px-[clamp(16px,3vw,30px)] pb-3.5 pt-3.5 min-[721px]:pt-1.5 ${run ? s.run : ""}`}
      >
        <div className={`${s.npHead} pb-1 pt-[18px] text-[14px] font-semibold text-ink-3`}>
          <span>What you typed</span>
          <span>What your agent wrote</span>
        </div>
        <div className={s.npRows}>
          {ROWS.map((r, i) => (
            <div key={r.raw} className={`${s.npRow} ${isStatic || i < shown ? s.show : ""}`}>
              <p className={`${s.raw} font-display italic leading-[1.3] text-ink-3`}>{r.raw}</p>
              <span aria-hidden className={s.bead} />
              <div className={s.clean}>
                <Chip tone={r.tone}>{r.label}</Chip>
                <p className="mt-[5px] text-[1.1rem] font-medium leading-[1.35] text-ink">{r.clean}</p>
                {r.meta ? <small className="mt-[3px] block text-[14.5px] text-ink-3">{r.meta}</small> : null}
              </div>
            </div>
          ))}
        </div>
      </InView>
      <div className="flex items-center justify-between gap-3.5 border-t border-line bg-surface-2 px-[22px] py-3.5">
        <p aria-live="polite" className="text-[15px] text-ink-3">
          {STATUS[phase]}
        </p>
        <Button type="button" onClick={onButton} disabled={phase === "running"}>
          {phase === "done" || isStatic ? "Start over" : "Generate notes"}
        </Button>
      </div>
    </Win>
  );
}
