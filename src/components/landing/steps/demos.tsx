"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/* Mini live demos for the five "How it works" stages. Each one is a small,
   honest re-enactment of the product moment (Appendix A1 of the 4-July brief):
   one continuous story — a Q2 pricing decision that resurfaces later. Every
   demo replays from its first frame when (re)mounted, which is exactly what
   the StageSwitch swap gives us; `still` renders the final frame statically
   for mobile / reduced motion. */

const EASE = [0.16, 1, 0.3, 1] as const;

/** Advances through numbered phases at the given timestamps (ms). */
function usePhases(times: number[], still: boolean) {
  const [phase, setPhase] = useState(still ? times.length : 0);
  useEffect(() => {
    if (still) return;
    setPhase(0);
    const ids = times.map((t, i) => setTimeout(() => setPhase(i + 1), t));
    return () => ids.forEach(clearTimeout);
    // times arrays are module constants per demo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still]);
  return phase;
}

function useTypewriter(full: string, active: boolean, still: boolean) {
  const [text, setText] = useState(still ? full : "");
  useEffect(() => {
    if (still) {
      setText(full);
      return;
    }
    if (!active) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setText(full.slice(0, i));
      if (i >= full.length) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [full, active, still]);
  return text;
}

/* ---------------- shared atoms ---------------- */

function DemoFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-[248px] flex-col justify-center overflow-hidden rounded-card border border-line bg-white p-5 shadow-[0_30px_60px_-42px_rgba(40,30,20,0.4)] sm:p-6">
      {children}
    </div>
  );
}

function Speaker({ name }: { name: string }) {
  return (
    <span className="font-mono text-[10.5px] uppercase tracking-wider text-ink-3">
      {name}
    </span>
  );
}

function Enter({
  show,
  children,
  className = "",
  delay = 0,
  y = 14,
}: {
  show: boolean;
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={false}
      animate={
        show
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: reduce ? 0 : y, scale: reduce ? 1 : 0.98 }
      }
      transition={{ duration: reduce ? 0 : 0.55, ease: EASE, delay: delay / 1000 }}
    >
      {children}
    </motion.div>
  );
}

function TagChip({
  children,
  tone = "clay",
}: {
  children: ReactNode;
  tone?: "clay" | "red" | "neutral";
}) {
  const look =
    tone === "clay"
      ? "border-signal/30 bg-signal-soft text-signal-deep"
      : tone === "red"
        ? "border-priority-high/30 bg-priority-high-soft text-priority-high"
        : "border-line bg-bg-2 text-ink-2";
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-[3px] text-[11px] font-semibold ${look}`}
    >
      {children}
    </span>
  );
}

function CheckDot({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-signal text-white ${className}`}
    >
      <svg viewBox="0 0 12 12" className="h-[62%] w-[62%]" aria-hidden>
        <path
          d="M2.5 6.2 5 8.5 9.5 3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/* ================================================================== */
/*  01 — Capture: the transcript streams; one line becomes a note.     */
/* ================================================================== */

const CAPTURE_TIMES = [400, 2600];

export function CaptureDemo({ still = false }: { still?: boolean }) {
  const phase = usePhases(CAPTURE_TIMES, still);
  const typed = useTypewriter(
    "Can we still hit the April launch if pricing slips?",
    phase >= 1,
    still,
  );

  return (
    <DemoFrame>
      <div className="flex items-center justify-between">
        <span className="kicker text-[10px] text-ink-3">Live transcript</span>
        <span className="flex items-center gap-1.5 text-[10.5px] font-medium text-signal-deep">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute h-full w-full animate-ping rounded-full bg-signal/50" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-signal" />
          </span>
          capturing
        </span>
      </div>

      <div className="mt-4 space-y-2.5 text-[13.5px] leading-snug">
        <p className="text-ink-3">
          <Speaker name="Priya" />{" "}
          …still waiting on the final pricing numbers.
        </p>
        <p className="min-h-[2.4em] text-ink">
          <Speaker name="Marcus" /> {typed}
          {!still && phase >= 1 && typed.length < 51 && (
            <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] rounded-full bg-signal align-middle" />
          )}
        </p>
      </div>

      {/* the line resolves into a role-relevant note */}
      <Enter show={phase >= 2} className="mt-4">
        <div className="rounded-2xl border border-signal/25 bg-signal-soft/50 p-4">
          <p className="text-[13.5px] font-medium leading-snug text-ink-display">
            Launch at risk if the pricing decision slips past April.
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-[10.5px] font-medium text-signal-deep">
            <CheckDot className="h-3.5 w-3.5" /> Role-relevant note · yours only
          </p>
        </div>
      </Enter>
    </DemoFrame>
  );
}

/* ================================================================== */
/*  02 — Label: chips snap onto the moment it's said.                  */
/* ================================================================== */

const LABEL_TIMES = [900, 1800];

export function LabelDemo({ still = false }: { still?: boolean }) {
  const phase = usePhases(LABEL_TIMES, still);

  return (
    <DemoFrame>
      <span className="kicker text-[10px] text-ink-3">Live transcript</span>

      <p className="mt-4 text-[15px] leading-relaxed text-ink">
        <Speaker name="Sarah" /> Okay —{" "}
        <span
          className={`rounded-md px-1 transition-colors duration-500 ${
            phase >= 1 ? "bg-signal-soft text-signal-deep" : ""
          }`}
        >
          lock the price at $49
        </span>
        , and{" "}
        <span
          className={`rounded-md px-1 transition-colors duration-500 ${
            phase >= 2 ? "bg-signal-soft text-signal-deep" : ""
          }`}
        >
          I&rsquo;ll own the rework
        </span>
        .
      </p>

      {/* chips fly in and dock beneath their phrases */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Enter show={phase >= 1} y={22}>
          <TagChip>Decision</TagChip>
        </Enter>
        <Enter show={phase >= 2} y={22} delay={60}>
          <TagChip>Action item</TagChip>
        </Enter>
        <span
          className={`text-[11px] text-ink-3 transition-opacity duration-500 ${
            phase >= 2 ? "opacity-100" : "opacity-0"
          }`}
        >
          labeled the moment it&rsquo;s said
        </span>
      </div>

      <div className="mt-5 border-t border-line pt-3.5">
        <p className="flex items-center gap-2 text-[11px] text-ink-3">
          <TagChip tone="red">Conflict</TagChip> flagged when the room disagrees
          — nothing slips by.
        </p>
      </div>
    </DemoFrame>
  );
}

/* ================================================================== */
/*  03 — Confirm: nothing commits without the one-tap confirm.         */
/* ================================================================== */

const CONFIRM_TIMES = [1100, 1900, 2450];

export function ConfirmDemo({ still = false }: { still?: boolean }) {
  const phase = usePhases(CONFIRM_TIMES, still);
  const reduce = useReducedMotion();
  const confirmed = phase >= 3;

  return (
    <DemoFrame>
      <div className="relative rounded-2xl border border-line bg-bg-2/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="kicker text-[10px] text-signal">Decision</span>
            <p className="mt-1.5 text-[14.5px] font-medium leading-snug text-ink-display">
              Lock pricing at $49 for Q3
            </p>
          </div>
          <span className="mt-0.5 h-8 w-1 shrink-0 rounded-full bg-priority-low/60" />
        </div>

        <div className="mt-4 flex items-center gap-2">
          <motion.button
            type="button"
            tabIndex={-1}
            aria-hidden
            initial={false}
            animate={
              confirmed
                ? { scale: 1 }
                : phase >= 2 && !reduce
                  ? { scale: 0.94 }
                  : { scale: 1 }
            }
            transition={{ duration: 0.18, ease: EASE }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors duration-300 ${
              confirmed
                ? "bg-signal text-white"
                : "border border-signal/40 bg-white text-signal-deep"
            }`}
          >
            {confirmed && <CheckDot className="h-3.5 w-3.5 bg-white/25" />}
            {confirmed ? "Confirmed" : "Confirm"}
          </motion.button>
          <span className="rounded-full border border-line bg-white px-3.5 py-1.5 text-[12px] text-ink-2">
            Edit
          </span>
          <span className="rounded-full border border-line bg-white px-3.5 py-1.5 text-[12px] text-ink-3">
            Dismiss
          </span>
        </div>

        {/* the tapping cursor */}
        {!still && !reduce && (
          <motion.span
            aria-hidden
            className="absolute z-10 text-ink"
            initial={{ left: "78%", top: "92%", opacity: 0 }}
            animate={
              phase >= 1
                ? { left: "17%", top: "68%", opacity: phase >= 3 ? 0 : 1 }
                : { left: "78%", top: "92%", opacity: 0 }
            }
            transition={{ duration: 0.8, ease: EASE }}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 drop-shadow" fill="currentColor" aria-hidden>
              <path d="M5.5 3.2 19 10.6l-6 1.4-2.6 5.6L5.5 3.2Z" stroke="white" strokeWidth="1.2" />
            </svg>
          </motion.span>
        )}
      </div>

      <Enter show={confirmed} className="mt-4" y={8}>
        <p className="flex items-center gap-2 text-[12px] text-ink-3">
          <CheckDot className="h-4 w-4" />
          Added to the knowledge graph.
        </p>
      </Enter>

      <p className="mt-4 border-t border-line pt-3.5 text-[11px] text-ink-3">
        One-tap confirm — nothing is saved or assigned silently.
      </p>
    </DemoFrame>
  );
}

/* ================================================================== */
/*  04 — Route: owner assigned, absentees covered.                     */
/* ================================================================== */

const ROUTE_TIMES = [600, 1600];

function MiniAvatar({ initials, ring = false }: { initials: string; ring?: boolean }) {
  return (
    <span
      className={`grid h-7 w-7 place-items-center rounded-full bg-signal-soft font-mono text-[10px] font-bold text-signal-deep ${
        ring ? "ring-2 ring-signal/50" : ""
      }`}
    >
      {initials}
    </span>
  );
}

export function RouteDemo({ still = false }: { still?: boolean }) {
  const phase = usePhases(ROUTE_TIMES, still);

  return (
    <DemoFrame>
      <div className="rounded-2xl border border-line bg-bg-2/50 p-4">
        <div className="flex items-center gap-2">
          <CheckDot className="h-4 w-4" />
          <p className="text-[13.5px] font-medium text-ink-display">
            Lock pricing at $49 for Q3
          </p>
        </div>

        <Enter show={phase >= 1} className="mt-4">
          <div className="flex items-center justify-between rounded-xl border border-line bg-white px-3.5 py-2.5">
            <span className="flex items-center gap-2.5">
              <MiniAvatar initials="SA" ring />
              <span className="text-[13px] font-medium text-ink">Sarah</span>
            </span>
            <TagChip>Owner assigned</TagChip>
          </div>
        </Enter>

        <Enter show={phase >= 2} className="mt-2.5">
          <div className="flex items-center justify-between rounded-xl border border-line bg-white px-3.5 py-2.5">
            <span className="flex items-center gap-2.5">
              <span className="flex -space-x-2">
                <MiniAvatar initials="PR" />
                <MiniAvatar initials="DI" />
              </span>
              <span className="text-[12.5px] text-ink-2">
                Shared with 2 who missed it — Priya, Diego
              </span>
            </span>
          </div>
        </Enter>
      </div>

      <p className="mt-4 border-t border-line pt-3.5 text-[11px] text-ink-3">
        Routed the moment you confirm — no follow-up email to write.
      </p>
    </DemoFrame>
  );
}

/* ================================================================== */
/*  05 — Remember: the decision travels to the next meeting.           */
/* ================================================================== */

const REMEMBER_TIMES = [900];

export function RememberDemo({ still = false }: { still?: boolean }) {
  const phase = usePhases(REMEMBER_TIMES, still);
  const reduce = useReducedMotion();
  const moved = phase >= 1;

  return (
    <DemoFrame>
      <div className="relative grid grid-cols-2 gap-3">
        {(
          [
            { title: "Q2 Planning", date: "Apr 3", from: true },
            { title: "Q3 Planning", date: "Jul 2", from: false },
          ] as const
        ).map((m) => (
          <div
            key={m.title}
            className={`rounded-2xl border p-3.5 pb-12 transition-colors duration-500 ${
              m.from === !moved
                ? "border-signal/30 bg-signal-soft/40"
                : "border-line bg-bg-2/50"
            }`}
          >
            <p className="text-[13px] font-medium text-ink-display">{m.title}</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-3">
              {m.date}
            </p>
          </div>
        ))}

        {/* the decision chip slides from Monday's meeting into Friday's */}
        <motion.span
          className="absolute bottom-3.5 inline-flex"
          initial={false}
          animate={{ left: moved ? "52%" : "3.5%" }}
          transition={
            reduce
              ? { duration: 0 }
              : { type: "spring", stiffness: 90, damping: 16 }
          }
        >
          <TagChip>Pricing locked at $49</TagChip>
        </motion.span>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-line pt-3.5">
        <span className="flex items-center gap-2 text-[11px] text-ink-3">
          <TagChip tone="neutral">→ Next meeting</TagChip>
          <TagChip tone="neutral">Cross-meeting memory</TagChip>
        </span>
      </div>
    </DemoFrame>
  );
}
