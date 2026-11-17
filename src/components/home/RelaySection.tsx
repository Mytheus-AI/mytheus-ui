"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, CheckCircle } from "@phosphor-icons/react";
import { MARK_PATH } from "@/components/Logo";
import s from "@/components/home/home.module.css";

/* Mytes talk to each other, drawn. Your Myte (the Mytheus mark on its disc, left) asks around:
   the question goes out to three other Mytes as thin lines, a dot riding each one. The two that
   were not in the meeting say so and fall back; Sarah's Myte, which was, lights up and sends
   the answer home on a coral line of its own, bowing over the top. It lands as the answer card
   below, cited to the meeting it came from. In the line language of the old home page's
   drawings (the agent relay, the five steps, the week's strands); each Myte is the whole Mytheus mark on its disc.

   One timeline, driven by a single `run` class: the strokes draw and the cards arrive on CSS
   delays, and the dots ride SMIL animateMotion started together with beginElementAt(offset).
   It plays when it scrolls in; "Ask again" replays it. Without JS, and under reduced motion, the
   finished exchange is shown. The question and the answer are real text below the drawing.
   Sample people and meetings. */

const W = 1000;
const H = 440;
const YOU = { x: 150, y: 240, r: 86 };
type Myte = { name: string; status: string; x: number; y: number; r: number; knows?: boolean };
/* the names sit to the right of these discs, so the discs stop well short of the right edge */
const OTHERS: Myte[] = [
  { name: "Sarah's Myte", status: "Was there, Tuesday", x: 660, y: 78, r: 56, knows: true },
  { name: "Ana's Myte", status: "Wasn't in that meeting", x: 660, y: 238, r: 48 },
  { name: "Tom's Myte", status: "Wasn't in that meeting", x: 660, y: 386, r: 48 },
];

/* The whole Mytheus mark, the tangle and its rising zigzag (MARK_PATH, as in the nav and the
   footer), stands for a Myte on its disc. It is drawn in an 802 x 414 box, its ink about 25..775
   by 10..400, so its centre is (400, 205) and its half-diagonal about 423 units. */
const MARK_C = { x: 400, y: 205, halfDiag: 423 };

const f = (n: number) => Math.round(n * 10) / 10;

/** The question's line: leaves your disc facing the other Myte, arrives level at its left edge. */
function askPath(o: Myte) {
  const a = Math.atan2(o.y - YOU.y, o.x - YOU.x) * 0.85;
  const sx = YOU.x + (YOU.r + 10) * Math.cos(a);
  const sy = YOU.y + (YOU.r + 10) * Math.sin(a);
  const ex = o.x - o.r - 10;
  const ey = o.y;
  const dx = ex - sx;
  return `M${f(sx)} ${f(sy)} C${f(sx + dx * 0.42)} ${f(sy)} ${f(sx + dx * 0.5)} ${f(ey)} ${f(ex)} ${f(ey)}`;
}

/** The answer's line: from the top of Sarah's disc, over the top, down into the top of yours. */
function answerPath(o: Myte) {
  const sx = o.x - (o.r + 10) * Math.cos(0.5);
  const sy = o.y - (o.r + 10) * Math.sin(0.5);
  const ex = YOU.x + (YOU.r + 10) * Math.cos(-1.1);
  const ey = YOU.y + (YOU.r + 10) * Math.sin(-1.1);
  return `M${f(sx)} ${f(sy)} C${f(sx - 170)} ${f(sy - 52)} ${f(ex + 160)} ${f(ey - 110)} ${f(ex)} ${f(ey)}`;
}

/** The mark centred on a disc, its corners well inside the rim, its stroke the same weight on every disc. */
function Mark({ x, y, r, className }: { x: number; y: number; r: number; className: string }) {
  const k = (r * 0.8) / MARK_C.halfDiag;
  return (
    <path
      className={className}
      d={MARK_PATH}
      strokeWidth={f(3 / k)}
      transform={`translate(${f(x - MARK_C.x * k)} ${f(y - MARK_C.y * k)}) scale(${f(k * 10000) / 10000})`}
    />
  );
}

const SARAH = OTHERS[0];
const ASK = OTHERS.map(askPath);
const ANSWER = answerPath(SARAH);
/* the timeline, in seconds */
const T = { ask: 0, askEach: 0.12, askDur: 0.9, found: 1.15, answer: 1.45, answerDur: 1.05 };

type Phase = "static" | "idle" | "run";

export function RelaySection() {
  const ref = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [phase, setPhase] = useState<Phase>("static");

  const play = useCallback(() => {
    setPhase("idle");
    // two frames: let the reset paint, then start the timeline from it
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setPhase("run");
        svg.current?.querySelectorAll<SVGAnimationElement>("[data-at]").forEach((a) => {
          try {
            a.beginElementAt(Number(a.dataset.at));
          } catch {
            /* SMIL missing: the dots stay hidden, the strokes and cards still play */
          }
        });
      }),
    );
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPhase("idle");
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        play();
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [play]);

  const state = phase === "idle" ? s.relayIdle : phase === "run" ? s.relayRun : "";

  return (
    <section id="relay" data-snap="" data-snap-label="Myte to Myte" className="relative overflow-hidden bg-pill py-[clamp(72px,10vw,136px)] text-pill-on min-[1000px]:flex min-[1000px]:min-h-[100svh] min-[1000px]:flex-col min-[1000px]:justify-center min-[1000px]:py-[clamp(40px,7vh,96px)]">
      {/* the words on the left, the drawing and the exchange on the right, so it fits one screen */}
      <div className="mx-auto grid w-[min(1280px,100%-40px)] items-center gap-x-[clamp(32px,5vw,80px)] gap-y-10 sm:w-[min(1280px,100%-80px)] lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <div data-snap-in="">
          <h2 className="display max-w-[12ch] text-[clamp(2.2rem,4.2vw,3.6rem)] leading-[1] !text-pill-on">Your Myte asks around, so you don&apos;t have to.</h2>
          <p className="mt-5 max-w-[40ch] text-[clamp(1.06rem,1.5vw,1.2rem)] leading-relaxed text-[color-mix(in_srgb,var(--pill-on)_72%,transparent)]">
            When it needs context, it asks the Myte of whoever knows. The answer comes back with its source: the exact meeting where it was
            said, so you can check it yourself.
          </p>
        </div>

        <div ref={ref} data-snap-in="" style={{ ["--si" as string]: 2 }} className={state}>
          {/* the drawing */}
          <div className="relative">
            <svg
              ref={svg}
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label="Your Myte asks three other Mytes. Two were not in the meeting; Sarah's Myte was, and sends the answer back."
              className="block h-auto w-full overflow-visible"
            >
              {ASK.map((d, i) => (
                <path
                  key={d}
                  className={`${s.rq} ${OTHERS[i].knows ? "" : s.rqMiss}`}
                  pathLength={1}
                  d={d}
                  style={{ ["--dl" as string]: `${T.ask + i * T.askEach}s` }}
                />
              ))}
              <path className={s.ra} pathLength={1} d={ANSWER} />

              {/* your Myte */}
              <circle className={s.rDisc} cx={YOU.x} cy={YOU.y} r={YOU.r} />
              <circle className={`${s.rRing} ${s.rRingYou}`} cx={YOU.x} cy={YOU.y} r={YOU.r + 5} />
              <Mark x={YOU.x} y={YOU.y} r={YOU.r} className={`${s.rMark} ${s.rMarkOn}`} />

              {/* the Mytes it asks */}
              {OTHERS.map((o) => (
                <g key={o.name} className={o.knows ? s.rKnows : s.rMisses}>
                  <circle className={s.rDisc} cx={o.x} cy={o.y} r={o.r} />
                  {o.knows ? <circle className={s.rRing} cx={o.x} cy={o.y} r={o.r + 5} /> : null}
                  <Mark x={o.x} y={o.y} r={o.r} className={s.rMark} />
                </g>
              ))}

              {/* the dots that carry the question out and the answer home (hidden until a run) */}
              {ASK.map((d, i) => (
                <circle key={`dot-${d}`} r={5} className={s.rDot} opacity={0}>
                  <animateMotion data-at={T.ask + i * T.askEach} dur={`${T.askDur}s`} begin="indefinite" fill="freeze" path={d} calcMode="spline" keyTimes="0;1" keySplines=".45 0 .25 1" />
                  <animate data-at={T.ask + i * T.askEach} attributeName="opacity" dur={`${T.askDur}s`} begin="indefinite" fill="freeze" values="0;1;1;0" keyTimes="0;.08;.85;1" />
                </circle>
              ))}
              <circle r={7} className={s.rDotA} opacity={0}>
                <animateMotion data-at={T.answer} dur={`${T.answerDur}s`} begin="indefinite" fill="freeze" path={ANSWER} calcMode="spline" keyTimes="0;1" keySplines=".45 0 .25 1" />
                <animate data-at={T.answer} attributeName="opacity" dur={`${T.answerDur}s`} begin="indefinite" fill="freeze" values="0;1;1;0" keyTimes="0;.06;.88;1" />
              </circle>
            </svg>

            {/* names, as HTML so they stay legible at any width */}
            <span
              className="absolute -translate-x-1/2 whitespace-nowrap font-display text-[clamp(.85rem,1.25vw,1.05rem)] italic text-pill-on"
              style={{ left: `${(YOU.x / W) * 100}%`, top: `${((YOU.y + YOU.r + 18) / H) * 100}%` }}
            >
              your Myte
            </span>
            {OTHERS.map((o) => (
              <span
                key={o.name}
                className={`absolute -translate-y-1/2 leading-tight ${o.knows ? s.rNameKnows : s.rNameMiss}`}
                style={{ left: `${((o.x + o.r + 18) / W) * 100}%`, top: `${(o.y / H) * 100}%` }}
              >
                <span className="block whitespace-nowrap font-display text-[clamp(.85rem,1.25vw,1.05rem)] italic">{o.name}</span>
                <span className={`${s.rStatus} hidden whitespace-nowrap text-[13px] font-semibold sm:block`}>{o.status}</span>
              </span>
            ))}
          </div>

          {/* the exchange, in words */}
          <div className="mt-[clamp(16px,2.4vw,28px)] grid gap-3 md:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
            <div className="rounded-card border border-[color-mix(in_srgb,var(--pill-on)_14%,transparent)] px-5 py-4">
              <p className="text-[13.5px] font-semibold text-[color-mix(in_srgb,var(--pill-on)_60%,transparent)]">Your Myte asks around</p>
              <p className="mt-1.5 font-display text-[clamp(1.1rem,1.4vw,1.25rem)] leading-snug">Was the QA window after code freeze ever agreed?</p>
            </div>
            <div className={`${s.rAnswer} rounded-card bg-[color-mix(in_srgb,var(--pill-on)_7%,transparent)] px-5 py-4`}>
              <p className="flex items-center gap-2 text-[13.5px] font-semibold text-[color-mix(in_srgb,var(--pill-on)_60%,transparent)]">
                <CheckCircle size={16} weight="fill" className="text-signal-line" aria-hidden />
                Sarah&apos;s Myte answers
              </p>
              <p className="mt-1.5 font-display text-[clamp(1.1rem,1.4vw,1.25rem)] leading-snug">Yes. Two extra days after freeze, agreed by Sarah and Raj.</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full bg-[color-mix(in_srgb,var(--pill-on)_12%,transparent)] px-[10px] py-[3px] text-[12.5px] font-semibold">
                  Cited: Q3 launch sync, Tuesday, 14:20
                </span>
                {phase !== "static" ? (
                  <button
                    type="button"
                    onClick={play}
                    className="inline-flex items-center gap-1.5 rounded-ctl px-3 py-1.5 text-[14px] font-semibold transition-colors hover:bg-[color-mix(in_srgb,var(--pill-on)_10%,transparent)]"
                  >
                    <ArrowCounterClockwise size={15} aria-hidden />
                    Ask again
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
