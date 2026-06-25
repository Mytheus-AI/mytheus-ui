"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Starting loader — the brand statement "Every meeting, on repeat."   */
/*  fills with the signal color (left → right) as a progress counter     */
/*  ticks 0 → 100, then the whole curtain lifts away to reveal the page. */
/*  Honest progress: eased over a short, fixed duration; respects        */
/*  reduced-motion and never blocks the page if JS is slow.              */
/* ------------------------------------------------------------------ */

const DURATION = 1900; // ms — the fill takes this long, then the curtain lifts
const EASE = [0.16, 1, 0.3, 1] as const;

export function Loader() {
  const reduce = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (reduce) {
      setProgress(100);
      const t = setTimeout(() => setDone(true), 300);
      return () => clearTimeout(t);
    }

    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setProgress(Math.round(eased * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setTimeout(() => setDone(true), 380);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  // Lock scroll while the curtain is up.
  useEffect(() => {
    document.body.style.overflow = done ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [done]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="loader"
          aria-hidden
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-paper px-6"
          initial={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: "-101%" }}
          transition={{ duration: 0.95, ease: EASE }}
        >
          {/* quiet living glow */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-70">
            <div className="aurora absolute left-1/2 top-1/2 h-[34rem] w-[44rem] -translate-x-1/2 -translate-y-1/2" />
          </div>

          {/* the statement: a ghost layer with a signal fill wiped over it */}
          <div className="relative text-center leading-[0.95]">
            {/* ghost / unfilled */}
            <h1 className="display-serif text-[clamp(2rem,11vw,7.5rem)] text-ink/[0.14]">
              Every meeting,
              <br />
              <span className="italic">on repeat.</span>
            </h1>
            {/* filled — clipped from the right by remaining progress */}
            <h1
              className="display-serif absolute inset-0 text-[clamp(2rem,11vw,7.5rem)] text-ink"
              style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}
            >
              Every meeting,
              <br />
              <span className="italic text-signal-deep">on repeat.</span>
            </h1>
          </div>

          {/* counter + progress hairline */}
          <div className="mt-10 flex items-center gap-4 sm:mt-12">
            <span className="font-mono text-[0.72rem] tabular-nums tracking-[0.2em] text-ink-soft">
              {String(progress).padStart(3, "0")}%
            </span>
            <span className="relative block h-px w-32 bg-line sm:w-40">
              <span
                className="absolute inset-y-0 left-0 bg-signal transition-[width] duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
