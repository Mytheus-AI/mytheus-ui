"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogoMark } from "@/components/Logo";
import { ConnectedGraph } from "@/components/landing/ConnectedGraph";

/* ================================================================== */
/*  AuthShell - the full-page frame every auth screen sits in.         */
/*                                                                     */
/*  Left (lg+): a rounded "stage" inset from the page edge - warm mesh, */
/*  paper grain, the living ConnectedGraph, and a reel of meeting       */
/*  memories trading places. It dramatizes the one idea the brand keeps */
/*  returning to: a decision on Monday is context on Friday.            */
/*  Right: the form, vertically centred, with its own header + footer.  */
/*  Below lg the stage folds into a soft mesh wash behind the form.     */
/* ================================================================== */

export type StageCopy = {
  kicker: string;
  title: string;
  /** trailing words rendered in the animated clay gradient */
  accent?: string;
  blurb?: string;
};

export function AuthShell({
  stage,
  aside,
  children,
}: {
  stage: StageCopy;
  /** top-right of the form column, e.g. "New here? Create an account" */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-[100dvh] bg-bg lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
      <Stage copy={stage} />

      <section className="relative flex min-h-[100dvh] flex-col px-6 py-6 sm:px-10 lg:px-14 xl:px-20">
        {/* mobile wash: the stage's mesh, faded out under the form */}
        <div
          aria-hidden
          className="mesh-field mesh-anim pointer-events-none absolute inset-x-0 top-0 h-80 lg:hidden"
          style={{ maskImage: "linear-gradient(180deg,#000 30%,transparent)", WebkitMaskImage: "linear-gradient(180deg,#000 30%,transparent)" }}
        />

        <div className="relative z-10 flex min-h-[44px] items-center justify-between gap-4">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-[24px] font-medium tracking-[-0.05em] text-ink lg:invisible"
            aria-label="Mytheus home"
          >
            <LogoMark size={24} />
            Mytheus
          </Link>
          {aside ? <div className="text-right text-[14px] text-ink-3">{aside}</div> : null}
        </div>

        <main className="relative z-10 flex flex-1 items-center">
          <div className="mx-auto w-full max-w-[420px] py-12">{children}</div>
        </main>

        <footer className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
          <span className="inline-flex items-center gap-2">
            <Lock />
            Sessions secured by Clerk
          </span>
          <nav className="flex gap-5">
            <Link href="/privacy" className="transition-colors hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-ink">
              Terms
            </Link>
            <Link href="/security" className="transition-colors hover:text-ink">
              Security
            </Link>
          </nav>
        </footer>
      </section>
    </div>
  );
}

/* ---------------- the stage ---------------- */

function Stage({ copy }: { copy: StageCopy }) {
  return (
    <aside className="hidden p-3 lg:sticky lg:top-0 lg:block lg:h-[100dvh]" aria-hidden>
      <div className="mesh-field mesh-anim grain relative flex h-full flex-col overflow-hidden rounded-[28px] border border-line px-10 py-9 xl:px-14 xl:py-12">
        <ConnectedGraph signal className="pointer-events-none absolute inset-0 opacity-45" nodeCount={26} />
        {/* a low clay bloom that anchors the headline */}
        <div className="pointer-events-none absolute -bottom-40 -left-32 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(217,119,87,0.22),transparent)]" />

        <div className="relative flex items-center justify-between">
          <Link
            href="/"
            tabIndex={-1}
            className="group pointer-events-auto inline-flex items-center gap-2 text-[26px] font-medium tracking-[-0.05em] text-ink"
          >
            <LogoMark size={28} />
            Mytheus
          </Link>
          <span className="kicker hidden xl:inline">Every meeting, on repeat.</span>
        </div>

        <div className="relative flex flex-1 items-center justify-end py-8">
          <MemoryReel />
        </div>

        <div className="relative">
          <p className="kicker mb-5">{copy.kicker}</p>
          <StageHeadline key={copy.title + (copy.accent ?? "")} title={copy.title} accent={copy.accent} />
          {copy.blurb ? (
            <p className="mt-6 max-w-[40ch] text-pretty text-[16px] leading-relaxed text-ink-3">{copy.blurb}</p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

/* ---------------- memory reel ---------------- */

type Memory = { day: string; meeting: string; tag: "Decision" | "Action" | "Context"; line: string; link?: string };

const MEMORIES: Memory[] = [
  {
    day: "Mon 09:30",
    meeting: "Pricing review",
    tag: "Decision",
    line: "Annual plans launch at 20% off for the first year.",
  },
  {
    day: "Wed 14:00",
    meeting: "Design crit",
    tag: "Action",
    line: "Onboarding copy ships before the Friday board prep.",
  },
  {
    day: "Fri 11:15",
    meeting: "Board prep",
    tag: "Context",
    line: "Monday's pricing call, surfaced before anyone asked.",
    link: "Linked from Pricing review",
  },
];

/**
 * Three memory cards in a fanned stack. Every few seconds the front card slides to the
 * back, so the stack keeps quietly re-ordering: the one primary motion on the stage.
 * Reduced motion: a settled, static stack.
 */
function MemoryReel() {
  const reduce = useReducedMotion();
  const [order, setOrder] = useState([0, 1, 2]);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setOrder(([a, b, c]) => [b, c, a]), 4200);
    return () => clearInterval(t);
  }, [reduce]);

  return (
    <div className="relative h-[230px] w-full max-w-[400px] xl:mr-6 [@media(max-height:700px)]:hidden">
      <AnimatePresence initial={false}>
        {order.map((idx, depth) => {
          const m = MEMORIES[idx];
          return (
            <motion.article
              key={idx}
              layout={!reduce}
              initial={false}
              animate={{
                y: depth * -22,
                x: depth * 14,
                scale: 1 - depth * 0.06,
                opacity: 1 - depth * 0.28,
                rotate: depth === 0 ? -1.5 : depth === 1 ? 1.2 : -0.4,
                zIndex: 3 - depth,
              }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-x-0 bottom-0 origin-top rounded-[22px] border border-line bg-white p-6 shadow-[0_40px_80px_-40px_rgba(40,30,20,0.5),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
                  {m.day} &middot; {m.meeting}
                </span>
                <span
                  className={`rounded-pill px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] ${
                    m.tag === "Context" ? "bg-signal text-white" : "bg-bg-2 text-ink-2"
                  }`}
                >
                  {m.tag}
                </span>
              </div>
              <p className="text-[19px] font-medium leading-snug tracking-[-0.02em] text-ink">{m.line}</p>
              <div className="mt-5 flex items-center gap-2.5 text-[13px] text-ink-3">
                {m.link ? (
                  <>
                    <span className="glow-pulse h-2 w-2 rounded-full bg-signal" />
                    <span className="text-signal-deep">{m.link}</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-line-2" />
                    <span>Proposed by your agent &middot; confirmed by you</span>
                  </>
                )}
              </div>
            </motion.article>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/**
 * The stage headline: each word lifts out of its own masked line on mount (the shared
 * `WordReveal` waits for scroll-into-view, which never fires for a headline pinned to the
 * bottom of a viewport-height stage). Descender room is reserved, per design.md.
 */
function StageHeadline({ title, accent }: { title: string; accent?: string }) {
  const words = [
    ...title.split(" ").map((w) => ({ w, accent: false })),
    ...(accent ? accent.split(" ").map((w) => ({ w, accent: true })) : []),
  ];
  return (
    <h2
      aria-label={[title, accent].filter(Boolean).join(" ")}
      className="display display-tight max-w-[12ch] text-balance text-[clamp(2.8rem,4.6vw,5.2rem)]"
    >
      {words.map((item, i) => (
        <span
          key={`${item.w}-${i}`}
          aria-hidden
          className="inline-block overflow-clip align-bottom"
          style={{ paddingBottom: "0.22em", marginBottom: "-0.22em" }}
        >
          <span
            className={`auth-word inline-block ${item.accent ? "text-gradient-signal" : ""}`}
            style={{ animationDelay: `${120 + i * 70}ms` }}
          >
            {item.w}
            {i < words.length - 1 ? "\u00a0" : ""}
          </span>
        </span>
      ))}
    </h2>
  );
}

function Lock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
