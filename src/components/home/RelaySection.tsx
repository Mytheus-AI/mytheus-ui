"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowsLeftRight, CheckCircle } from "@phosphor-icons/react";

/* Mytes talk to each other. Shown as the exchange itself, an honest log between two agents:
   your Myte asks, Sarah's Myte answers with the meeting it came from, and the answer lands in
   front of you, cited. It types itself out when it scrolls in; "Ask again" replays it. Reduced
   motion (and no JS) shows the finished exchange. Sample people and meetings. */

const LOG = [
  { at: "09:41:02", from: "Your Myte", to: "Sarah's Myte", text: "Was the QA window after code freeze ever agreed?" },
  { at: "09:41:03", from: "Sarah's Myte", to: "Your Myte", text: "Yes. Two extra days after freeze, agreed by Sarah and Raj." },
  { at: "09:41:03", from: "Sarah's Myte", to: "Your Myte", text: "Source: Q3 launch sync, Tuesday, 14:20." },
];

export function RelaySection() {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<number[]>(LOG.map((l) => l.text.length));
  const [done, setDone] = useState(true);
  const [run, setRun] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timers: number[] = [];
    let started = false;
    const play = () => {
      setDone(false);
      setShown(LOG.map(() => 0));
      let t = 300;
      LOG.forEach((line, k) => {
        for (let c = 1; c <= line.text.length; c++) {
          t += 18 + (c % 7 === 0 ? 40 : 0);
          timers.push(window.setTimeout(() => setShown((prev) => prev.map((v, j) => (j === k ? c : v))), t));
        }
        t += k === 0 ? 900 : 350;
      });
      timers.push(window.setTimeout(() => setDone(true), t + 200));
    };
    if (run > 0) {
      play();
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          if (started || !entries.some((e) => e.isIntersecting)) return;
          started = true;
          io.disconnect();
          play();
        },
        { threshold: 0.45 },
      );
      io.observe(el);
      return () => {
        io.disconnect();
        timers.forEach(window.clearTimeout);
      };
    }
    return () => {
      timers.forEach(window.clearTimeout);
      timers = [];
    };
  }, [run]);

  return (
    <section id="relay" data-snap="" data-snap-label="Myte to Myte" className="relative overflow-hidden bg-pill py-[clamp(72px,10vw,136px)] text-pill-on min-[1000px]:flex min-[1000px]:min-h-[100svh] min-[1000px]:flex-col min-[1000px]:justify-center">
      <div className="mx-auto w-[min(1280px,100%-40px)] sm:w-[min(1280px,100%-80px)]">
        <div data-snap-in="" className="grid items-end gap-x-14 gap-y-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <h2 className="display max-w-[16ch] text-[clamp(2.2rem,4.8vw,3.8rem)] leading-[1] !text-pill-on">Your Myte asks around, so you don&apos;t have to.</h2>
          <p className="max-w-[46ch] text-[clamp(1.06rem,1.5vw,1.2rem)] leading-relaxed text-[color-mix(in_srgb,var(--pill-on)_72%,transparent)]">
            When it needs context, it asks the Myte of whoever knows. The answer comes back with its source: the exact meeting where it was
            said, so you can check it yourself.
          </p>
        </div>

        <div ref={ref} data-snap-in="" style={{ ["--si" as string]: 2 }} className="mt-[clamp(36px,5vw,64px)] overflow-hidden rounded-hero border border-[color-mix(in_srgb,var(--pill-on)_14%,transparent)]">
          <div className="flex items-center justify-between gap-4 border-b border-[color-mix(in_srgb,var(--pill-on)_14%,transparent)] px-5 py-3.5 text-[13.5px] text-[color-mix(in_srgb,var(--pill-on)_70%,transparent)]">
            <span className="inline-flex items-center gap-2 font-semibold">
              <ArrowsLeftRight size={16} aria-hidden />
              Myte to Myte
            </span>
            <button
              type="button"
              onClick={() => setRun((r) => r + 1)}
              className="rounded-ctl px-3 py-1.5 font-semibold text-pill-on transition-colors hover:bg-[color-mix(in_srgb,var(--pill-on)_10%,transparent)]"
            >
              Ask again
            </button>
          </div>
          <ol className="grid gap-0 font-mono text-[clamp(14px,1.35vw,16.5px)] leading-relaxed">
            {LOG.map((l, k) => (
              <li
                key={k}
                className={`grid gap-x-6 gap-y-1 px-5 py-4 transition-opacity duration-300 md:grid-cols-[96px_270px_minmax(0,1fr)] ${shown[k] === 0 ? "opacity-0" : "opacity-100"} ${
                  k > 0 ? "border-t border-[color-mix(in_srgb,var(--pill-on)_8%,transparent)]" : ""
                }`}
              >
                <span className="tabular-nums text-[color-mix(in_srgb,var(--pill-on)_50%,transparent)]">{l.at}</span>
                <span className="text-[color-mix(in_srgb,var(--pill-on)_70%,transparent)]">
                  {l.from} <span className="text-signal-line">&rarr;</span> {l.to}
                </span>
                <span>
                  <span className="sr-only">{l.text}</span>
                  <span aria-hidden>{l.text.slice(0, shown[k])}</span>
                </span>
              </li>
            ))}
          </ol>
          <div
            className={`flex flex-wrap items-center gap-3 border-t border-[color-mix(in_srgb,var(--pill-on)_14%,transparent)] bg-[color-mix(in_srgb,var(--pill-on)_6%,transparent)] px-5 py-4 transition-[opacity,transform] duration-500 ${
              done ? "opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            <CheckCircle size={20} weight="fill" className="text-signal-line" aria-hidden />
            <p className="text-[16px] font-semibold">Answered in your sidebar: two extra days after freeze.</p>
            <span className="rounded-full bg-[color-mix(in_srgb,var(--pill-on)_12%,transparent)] px-[10px] py-[3px] text-[12.5px] font-semibold">
              Cited, Q3 launch sync, Tuesday
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
