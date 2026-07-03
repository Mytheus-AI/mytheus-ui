"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useInView,
  useReducedMotion,
} from "framer-motion";
import { Reveal } from "./motion";
import { Eyebrow } from "./ui";

/* ================================================================== */
/*  NotesEnhanceDemo — the "before & after" notepad widget.            */
/*  A Granola-style composition: an off-white notepad sitting on a     */
/*  clay "stacked paper" card, with a two-person video PiP tucked      */
/*  into the corner. Shorthand notes type themselves in, a             */
/*  "Generate notes" beat plays, then they cross-fade into clean,      */
/*  structured minutes. The My notes / Enhanced toggle replays it.     */
/* ================================================================== */

type Mode = "raw" | "enhancing" | "enhanced";

const RAW = [
  "confirm ICP alignment",
  "Deal stalls — need sales input??",
  "Q3 messaging rollout — teams ready??",
  "pricing page = blocker, follow up tues",
];

/* stacked-paper sheets behind the notepad — clay, matching the theme */
const PAPER_BACK = "var(--signal-bright)"; /* #e8a489 */
const PAPER_MID = "var(--signal-soft)"; /* #f5e5dc */

/* A live wall-clock (HH:MM, 24h) that ticks with the real current time so the
   meeting reads as happening right now. Renders a stable placeholder on the
   server / first paint to stay hydration-safe, then fills in client-side. */
function useWallClock() {
  const [clock, setClock] = useState("--:--");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      setClock(`${h}:${m}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return clock;
}

export function NotesEnhanceDemo() {
  return (
    <section id="demo" className="px-3 py-24 sm:px-5 sm:py-32">
      <div className="mx-auto max-w-[1340px]">
        <Reveal className="text-center">
          <Eyebrow>Show, don&apos;t tell</Eyebrow>
          <h2 className="display mx-auto mt-4 max-w-[20ch] text-[clamp(2.2rem,5.5vw,4rem)]">
            Your shorthand, returned as minutes.
          </h2>
          <p className="mx-auto mt-5 max-w-[48ch] text-[17px] leading-relaxed text-ink-3">
            Jot whatever you catch on the call. Your agent turns the mess into
            clean, structured, shareable notes — headings, owners, next steps.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-16 flex justify-center sm:mt-20">
            <NotesWidget />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  NotesWidget — the live, interactive notepad on its own. Typing →   */
/*  Generate notes → Enhancing… → structured minutes, with the My      */
/*  notes / Enhanced toggle. Self-contained so it can be reused (it is  */
/*  also dropped into the hero). Starts the moment it scrolls in.       */
/* ================================================================== */

export function NotesWidget() {
  const reduce = useReducedMotion();
  const clock = useWallClock();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px -15% 0px" });

  const [mode, setMode] = useState<Mode>("raw");
  const [typed, setTyped] = useState<string[]>(RAW.map(() => ""));
  const [typingDone, setTypingDone] = useState(false);
  const started = useRef(false);
  const auto = useRef(true);
  const enhanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // type the raw notes in, line by line, when first scrolled into view
  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    if (reduce) {
      setTyped(RAW);
      setTypingDone(true);
      return;
    }
    let li = 0;
    let ci = 0;
    const id = setInterval(() => {
      if (li >= RAW.length) {
        clearInterval(id);
        setTypingDone(true);
        return;
      }
      ci += 1;
      const line = li;
      const slice = RAW[li].slice(0, ci);
      setTyped((prev) => {
        const next = [...prev];
        next[line] = slice;
        return next;
      });
      if (ci >= RAW[li].length) {
        li += 1;
        ci = 0;
      }
    }, 30);
    return () => clearInterval(id);
  }, [inView, reduce]);

  // once typed, auto-play the enhance sequence (unless the user took over)
  useEffect(() => {
    if (!typingDone || !auto.current) return;
    const t1 = setTimeout(() => setMode("enhancing"), reduce ? 200 : 950);
    const t2 = setTimeout(() => setMode("enhanced"), reduce ? 400 : 2500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [typingDone, reduce]);

  function enhance() {
    auto.current = false;
    setMode("enhancing");
    if (enhanceTimer.current) clearTimeout(enhanceTimer.current);
    enhanceTimer.current = setTimeout(() => setMode("enhanced"), reduce ? 250 : 1200);
  }
  function choose(target: "raw" | "enhanced") {
    auto.current = false;
    if (target === "raw") {
      setTyped(RAW);
      setTypingDone(true);
      setMode("raw");
    } else {
      enhance();
    }
  }

  const tab: "raw" | "enhanced" = mode === "raw" ? "raw" : "enhanced";

  return (
    <div ref={ref} className="relative w-full max-w-[460px]">
              {/* clay "stacked paper" cards behind */}
              <div
                aria-hidden
                className="absolute -left-4 top-6 h-full w-full rounded-[26px] sm:-left-6 sm:top-8"
                style={{ background: PAPER_BACK }}
              />
              <div
                aria-hidden
                className="absolute -left-2 top-3 h-full w-full rounded-[26px] sm:-left-3 sm:top-4"
                style={{ background: PAPER_MID }}
              />

              {/* the notepad */}
              <div className="relative flex min-h-[540px] flex-col rounded-[26px] border border-line bg-[#fbfbf8] shadow-[0_50px_120px_-44px_rgba(40,40,20,0.5)]">
                {/* header */}
                <div className="px-6 pt-6">
                  <h3 className="text-[22px] font-semibold tracking-tight text-ink-display">
                    Q3 GTM sync
                  </h3>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-2 px-2.5 py-1 text-[12px] font-medium text-ink-2">
                      <CalIcon /> Today
                    </span>
                    <Attendees />
                    <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-3">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="glow-pulse absolute inline-flex h-full w-full rounded-full bg-signal opacity-60" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal" />
                      </span>
                      <span suppressHydrationWarning>{clock}</span>
                    </span>
                  </div>
                </div>

                {/* toggle */}
                <div className="mt-5 px-6">
                  <Toggle tab={tab} onChoose={choose} />
                </div>

                {/* body */}
                <div className="relative mt-4 flex-1 px-6 pb-4">
                  <AnimatePresence mode="wait">
                    {tab === "raw" ? (
                      <motion.div
                        key="raw"
                        initial={reduce ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={reduce ? undefined : { opacity: 0, filter: "blur(4px)" }}
                        transition={{ duration: 0.4 }}
                      >
                        <RawNotes typed={typed} typingDone={typingDone} reduce={reduce} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="enhanced"
                        initial={reduce ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <EnhancedNotes reduce={reduce} />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* enhancing overlay */}
                  <AnimatePresence>
                    {mode === "enhancing" && (
                      <motion.div
                        key="overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0 flex items-center justify-center bg-[#fbfbf8]/70 backdrop-blur-[2px]"
                      >
                        <span className="inline-flex items-center gap-2.5 rounded-full border border-line bg-white px-4 py-2.5 text-[14px] font-medium text-ink-2 shadow-lg">
                          <Sparkle spinning={!reduce} />
                          Enhancing notes…
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* footer: generate button (raw) */}
                <div className="px-6 pb-6">
                  <AnimatePresence mode="wait">
                    {tab === "raw" ? (
                      <motion.button
                        key="gen"
                        type="button"
                        onClick={enhance}
                        initial={reduce ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduce ? undefined : { opacity: 0, y: -8 }}
                        whileHover={reduce ? undefined : { y: -2 }}
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-pill py-3.5 text-[15px] font-medium text-white shadow-[0_18px_40px_-18px_rgba(20,20,10,0.7)]"
                      >
                        <Sparkle />
                        Generate notes
                      </motion.button>
                    ) : (
                      <motion.div
                        key="done"
                        initial={reduce ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-center gap-2 py-3 text-[13px] font-medium text-ink-3"
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-signal text-white">
                          <CheckIcon small />
                        </span>
                        Enhanced by your agent · just now
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

      {/* two-person stacked video PiP */}
      <PiPCall reduce={reduce} />
    </div>
  );
}

/* ---------------- attendees ---------------- */

function Attendees() {
  const items = [
    { i: "M", c: "bg-signal-soft text-signal-deep" },
    { i: "R", c: "bg-signal-soft text-signal-deep" },
    { i: "P", c: "bg-bg-3 text-ink-2" },
  ];
  return (
    <span className="flex -space-x-1.5">
      {items.map((a) => (
        <span
          key={a.i}
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ring-2 ring-[#fbfbf8] ${a.c}`}
        >
          {a.i}
        </span>
      ))}
    </span>
  );
}

/* ---------------- segmented control ---------------- */

function Toggle({
  tab,
  onChoose,
}: {
  tab: "raw" | "enhanced";
  onChoose: (t: "raw" | "enhanced") => void;
}) {
  const items: { key: "raw" | "enhanced"; label: string }[] = [
    { key: "raw", label: "My notes" },
    { key: "enhanced", label: "Enhanced" },
  ];
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-2 p-1">
      {items.map((it) => {
        const on = tab === it.key;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChoose(it.key)}
            className={`relative rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              on ? "text-white" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {on && (
              <motion.span
                layoutId="notesToggle"
                className="absolute inset-0 rounded-full bg-signal"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {it.key === "enhanced" && <Sparkle small inert={!on} />}
              {it.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- raw (before) ---------------- */

function RawNotes({
  typed,
  typingDone,
  reduce,
}: {
  typed: string[];
  typingDone: boolean;
  reduce: boolean | null;
}) {
  const activeLine = typed.findIndex((t, i) => t.length < RAW[i].length);
  return (
    <ul className="space-y-3.5 font-mono text-[15px] leading-relaxed text-ink-2">
      {typed.map((t, i) => {
        const showCaret = !reduce && !typingDone && i === activeLine;
        if (!t && !showCaret) return <li key={i} className="h-[1.4em]" aria-hidden />;
        return (
          <li key={i} className="flex gap-2.5">
            <span className="select-none text-ink-3/50">—</span>
            <span className="text-ink-2">
              {t}
              {showCaret && (
                <span className="ml-0.5 inline-block h-[1.05em] w-[2px] -translate-y-[2px] animate-pulse bg-signal align-middle" />
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------- enhanced (after) ---------------- */

const itemV = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function EnhancedNotes({ reduce }: { reduce: boolean | null }) {
  return (
    <motion.div
      variants={reduce ? undefined : { show: { transition: { staggerChildren: 0.09 } } }}
      initial={reduce ? false : "hidden"}
      animate="show"
      className="space-y-5"
    >
      <motion.div variants={reduce ? undefined : itemV} className="flex flex-wrap gap-2">
        <Tag tone="decision">2 decisions</Tag>
        <Tag tone="action">3 action items</Tag>
        <Tag tone="risk">1 blocker</Tag>
      </motion.div>

      <Block
        reduce={reduce}
        heading="ICP Alignment — confirmed"
        kind="decision"
        items={[
          <>
            Agreed to <b>narrow Q3 focus</b> to mid-market SaaS (50–500 seats).
          </>,
          <>
            Marketing and Sales now <b>aligned on the ICP</b>.
          </>,
        ]}
      />

      <Block
        reduce={reduce}
        heading="Risks & blockers"
        kind="risk"
        items={[
          <>
            <b>Deals stalling</b> — needs <b>Sales input</b> on objections.
          </>,
          <>
            The <b>pricing page</b> is the main conversion blocker.
          </>,
        ]}
      />

      <ActionBlock
        reduce={reduce}
        items={[
          <>
            <b>Raj</b> — gather sales input on stalled deals <Due>Tue</Due>
          </>,
          <>
            <b>Maya</b> — confirm Q3 messaging readiness
          </>,
          <>
            Ship updated <b>pricing page</b> copy
          </>,
        ]}
      />
    </motion.div>
  );
}

function Block({
  heading,
  items,
  kind,
  reduce,
}: {
  heading: string;
  items: React.ReactNode[];
  kind: "decision" | "risk";
  reduce: boolean | null;
}) {
  return (
    <motion.section variants={reduce ? undefined : itemV}>
      <h4 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink-display">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            kind === "risk" ? "bg-signal-deep" : "bg-signal"
          }`}
        />
        {heading}
      </h4>
      <ul className="mt-2 space-y-1.5 pl-4">
        {items.map((it, i) => (
          <li
            key={i}
            className="relative text-[15px] leading-relaxed text-ink-2 before:absolute before:-left-4 before:top-[0.65em] before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full before:bg-line-2 [&_b]:font-semibold [&_b]:text-ink-display"
          >
            {it}
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

function ActionBlock({
  items,
  reduce,
}: {
  items: React.ReactNode[];
  reduce: boolean | null;
}) {
  return (
    <motion.section variants={reduce ? undefined : itemV}>
      <h4 className="text-[15px] font-semibold tracking-tight text-ink-display">
        Next steps
      </h4>
      <ul className="mt-2 space-y-2">
        {items.map((it, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 text-[15px] leading-relaxed text-ink-2 [&_b]:font-semibold [&_b]:text-ink-display"
          >
            <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border border-signal/40 bg-signal-soft">
              <span className="h-1.5 w-1.5 rounded-[2px] bg-signal" />
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

function Due({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1 rounded-full bg-signal-soft px-2 py-0.5 text-[11px] font-medium text-signal-deep">
      {children}
    </span>
  );
}

function Tag({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "decision" | "action" | "risk";
}) {
  const look =
    tone === "risk"
      ? "border-signal-deep/30 text-signal-deep"
      : tone === "action"
        ? "border-line text-ink-2"
        : "border-signal/30 text-signal-deep";
  return (
    <span className={`rounded-full border bg-white px-2.5 py-1 text-[12px] font-medium ${look}`}>
      {children}
    </span>
  );
}

/* ---------------- two-person stacked video PiP ---------------- */

function PiPCall({ reduce }: { reduce: boolean | null }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="absolute -bottom-10 -right-3 z-10 flex flex-col gap-2 sm:-right-10"
    >
      <VideoTile initial="M" grad="from-[#6f7d52] to-[#2c3018]" live />
      <VideoTile initial="R" grad="from-[#6b86ad] to-[#2c3a4f]" className="ml-5" />
    </motion.div>
  );
}

function VideoTile({
  initial,
  grad,
  live,
  className = "",
}: {
  initial: string;
  grad: string;
  live?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative h-[104px] w-[128px] overflow-hidden rounded-[14px] border-2 border-white bg-gradient-to-br shadow-[0_24px_50px_-20px_rgba(20,20,10,0.6)] ${grad} ${className}`}
    >
      {/* soft camera vignette */}
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_40%_30%,rgba(255,255,255,0.28),transparent_70%)]" />
      <span className="absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[16px] font-semibold text-ink-display">
        {initial}
      </span>
      {live && (
        <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full bg-black/45 px-1.5 py-0.5 text-[8px] font-semibold tracking-wide text-white backdrop-blur-sm">
          <span className="h-1 w-1 rounded-full bg-signal" /> LIVE
        </span>
      )}
      <span className="absolute bottom-1.5 right-1.5 flex h-2.5 items-center gap-[1.5px]">
        {[0.5, 1, 0.6].map((h, i) => (
          <motion.span
            key={i}
            className="w-[2px] rounded-full bg-white/85"
            style={{ height: `${h * 100}%` }}
            animate={{ scaleY: [0.4, 1, 0.5, 0.9, 0.4] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
          />
        ))}
      </span>
    </div>
  );
}

/* ---------------- icons ---------------- */

function Sparkle({
  spinning,
  small,
  inert,
}: {
  spinning?: boolean;
  small?: boolean;
  inert?: boolean;
}) {
  const size = small ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      className={`${size} ${inert ? "text-current" : ""}`}
      animate={spinning ? { rotate: 360, scale: [1, 1.15, 1] } : undefined}
      transition={spinning ? { duration: 1.4, repeat: Infinity, ease: "linear" } : undefined}
      aria-hidden
    >
      <path
        d="M12 3l1.6 4.8L18 9.4l-4.4 1.6L12 16l-1.6-5L6 9.4l4.4-1.6L12 3z"
        fill="currentColor"
      />
      <circle cx="18.5" cy="5.5" r="1.3" fill="currentColor" />
      <circle cx="5.5" cy="16.5" r="1" fill="currentColor" />
    </motion.svg>
  );
}

function CheckIcon({ small }: { small?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={small ? "h-3 w-3" : "h-4 w-4"} aria-hidden>
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <rect x="2.5" y="3.5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.5 6.5h11M5.5 2.5v2M10.5 2.5v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
