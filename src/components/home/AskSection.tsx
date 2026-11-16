"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, PaperPlaneRight } from "@phosphor-icons/react";
import { LogoMark } from "@/components/Logo";
import { QA } from "@/components/home/FaqSection";
import s from "@/components/home/home.module.css";

/* Ask a Myte: the questions people ask first, answered the way a Myte answers in a meeting.
   Pick a question and it lands as yours; the Myte's answer streams in word by word (like the
   agent-stream deltas in the room), then settles with a link to the page that backs it up. The
   first question plays by itself the first time the section is reached. One exchange at a time,
   in a card of fixed height on desktop, so nothing below jumps (on a phone it grows with the answer).

   The answers are the site's FAQ copy (QA in FaqSection.tsx), nothing generated. The whole answer
   is in the DOM for screen readers from the start (the streamed copy is aria-hidden), and the
   live region announces the question that was picked. Reduced motion shows answers at once. */

const SOURCES: { label: string; href: string }[] = [
  { label: "Your Myte", href: "/features/personal-agent" },
  { label: "Integrations", href: "/features/integrations" },
  { label: "Decision tracking", href: "/features/decisions" },
  { label: "Cross-meeting answers", href: "/features/context-gaps" },
  { label: "Security", href: "/security" },
  { label: "Pricing", href: "/pricing" },
];

export function AskSection() {
  const ref = useRef<HTMLElement>(null);
  const [pick, setPick] = useState(0);
  const [shown, setShown] = useState(QA[0].a.split(" ").length);
  const [phase, setPhase] = useState<"idle" | "thinking" | "streaming" | "done">("done");
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  };

  const ask = useCallback((i: number) => {
    clear();
    setPick(i);
    const words = QA[i].a.split(" ").length;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(words);
      setPhase("done");
      return;
    }
    setShown(0);
    setPhase("thinking");
    let t = 650;
    timers.current.push(window.setTimeout(() => setPhase("streaming"), t));
    for (let w = 1; w <= words; w++) {
      t += 34 + (w % 6 === 0 ? 70 : 0);
      timers.current.push(window.setTimeout(() => setShown(w), t));
    }
    timers.current.push(window.setTimeout(() => setPhase("done"), t + 250));
  }, []);

  // play the first question once, the first time the section is reached
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setPhase("idle");
    setShown(0);
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        ask(0);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clear();
    };
  }, [ask]);

  const words = QA[pick].a.split(" ");
  const source = SOURCES[pick];

  return (
    <section
      id="questions"
      ref={ref}
      data-snap=""
      data-snap-label="Ask a Myte"
      className="py-[clamp(72px,10vw,136px)] min-[1000px]:flex min-[1000px]:min-h-[100svh] min-[1000px]:flex-col min-[1000px]:justify-center"
    >
      <div className="mx-auto grid w-[min(1280px,100%-40px)] items-center gap-x-[clamp(32px,6vw,96px)] gap-y-10 sm:w-[min(1280px,100%-80px)] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div data-snap-in="">
          <h2 className="display max-w-[11ch] text-[clamp(2.4rem,5vw,4.2rem)] leading-[0.98]">Ask a Myte.</h2>
          <p className="mt-5 max-w-[40ch] text-[clamp(1.06rem,1.5vw,1.2rem)] leading-relaxed text-ink-3">
            These are the questions people ask first. Pick one and a Myte answers it the way it answers in your meetings: short, plain, and
            with its source.
          </p>
          <p className="mt-6 text-[15px] text-ink-3">
            Something else?{" "}
            <a href="mailto:hello@mytheus.cloud" className="font-semibold text-ink underline decoration-signal-line decoration-2 underline-offset-[5px]">
              Write to the team
            </a>
            .
          </p>
        </div>

        <div data-snap-in="" style={{ ["--si" as string]: 2 }} className="overflow-hidden rounded-hero border border-line bg-surface shadow-warm-2">
          {/* the exchange */}
          <div className="flex min-h-[320px] flex-col lg:h-[clamp(400px,48vh,470px)] justify-end gap-4 bg-[radial-gradient(120%_80%_at_100%_0%,var(--signal-soft),transparent_60%)] p-[clamp(18px,2.4vw,30px)]">
            <p aria-live="polite" className="ml-auto max-w-[85%] rounded-[20px] rounded-br-md bg-pill px-4 py-2.5 text-[16px] font-medium text-pill-on">
              {QA[pick].q}
            </p>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-full bg-pill">
                <LogoMark size={13} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-ink-3">
                  A Myte
                  {phase === "thinking" ? <span className={s.thinking}> is checking</span> : null}
                </p>
                <p className="mt-1 font-display text-[clamp(1.2rem,1.7vw,1.5rem)] leading-[1.42] text-ink">
                  <span className="sr-only">{QA[pick].a}</span>
                  <span aria-hidden>
                    {words.slice(0, shown).join(" ")}
                    {phase === "streaming" ? <span className={s.caret} /> : null}
                  </span>
                </p>
                <Link
                  href={source.href}
                  className={`mt-3 inline-flex items-center gap-1.5 rounded-full bg-signal-soft px-3 py-1 text-[13px] font-semibold text-signal-ink transition-[opacity,transform] duration-300 hover:bg-[color-mix(in_srgb,var(--signal-soft)_70%,var(--signal-line))] ${
                    phase === "done" ? "opacity-100" : "pointer-events-none translate-y-1 opacity-0"
                  }`}
                  tabIndex={phase === "done" ? 0 : -1}
                >
                  Source: {source.label}
                  <ArrowUpRight size={13} weight="bold" aria-hidden />
                </Link>
              </div>
            </div>
          </div>

          {/* the composer: the questions, as the things you could ask */}
          <div className="border-t border-line bg-surface-2 p-[clamp(14px,1.8vw,20px)]">
            <p className="mb-3 flex items-center gap-2 px-1 text-[13.5px] font-semibold text-ink-3">
              <PaperPlaneRight size={15} aria-hidden />
              Pick a question
            </p>
            <ul className="flex flex-wrap gap-2" aria-label="Questions">
              {QA.map((item, i) => (
                <li key={item.q}>
                  <button
                    type="button"
                    onClick={() => ask(i)}
                    aria-pressed={pick === i}
                    className={`rounded-full border px-3.5 py-2 text-left text-[14px] font-medium transition-colors ${
                      pick === i ? "border-pill bg-pill text-pill-on" : "border-line-2 bg-surface text-ink-2 hover:border-ink-3 hover:text-ink"
                    }`}
                  >
                    {item.q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
