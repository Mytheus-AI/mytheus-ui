"use client";

import Image from "next/image";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import Link from "next/link";
import {
  Float,
  Reveal,
  Stagger,
  StaggerItem,
  Tilt,
  WordReveal,
} from "@/components/landing/motion";
import { Eyebrow } from "@/components/landing/ui";

/* ------------------------------------------------------------------ */
/*  AboutCrew — the team moment of the about page.                     */
/*  1. The centerpiece: the one photo of all four CyberSprinters on a  */
/*     beach, presented like a print — clay stacked-paper sheets       */
/*     behind, a whisper of Tilt, a slow-breathing warm vignette, a    */
/*     grayscale→warm hover develop with a sheen sweep, and floating   */
/*     name chips bobbing around the frame (md+; a static name row     */
/*     below the photo on mobile).                                     */
/*  2. Four member panels, each alive: a giant ghost index (01–04)     */
/*     that parallax-drifts against the cursor, a clay gradient        */
/*     avatar with a glassy glint, a two-layer name that slides to     */
/*     its clay twin on hover, and an accent bar that grows across     */
/*     the card. One-liners stay generic-true: they all build          */
/*     agentic products end to end.                                    */
/*  3. The motif: a thin clay thread drawn (pathLength on view)        */
/*     across the row BEHIND the cards, surfacing in the gaps — one    */
/*     line running through all four.                                  */
/*  Every bespoke animation collapses to a complete static layout      */
/*  under prefers-reduced-motion; hover physics never change layout    */
/*  (the bar/name/index all animate inside reserved space).            */
/* ------------------------------------------------------------------ */

type Member = {
  name: string;
  initials: string;
  line: string;
};

const MEMBERS: Member[] = [
  {
    name: "Sushan Shetty",
    initials: "SS",
    line: "Takes an idea from whiteboard to working agent without dropping the thread.",
  },
  {
    name: "Samar Rihan",
    initials: "SR",
    line: "Builds the whole surface — the logic, the pixels, and everything between.",
  },
  {
    name: "Shaun Marvell Rodrigues",
    initials: "SM",
    line: "Happiest when a half-formed prompt turns into a product you can actually ship.",
  },
  {
    name: "Yash V Maurya",
    initials: "YM",
    line: "End to end by default: design it, wire it, ship it, then obsess over it.",
  },
];

/* floating chip placement around the photo frame — deliberately NOT
   mapped to who stands where in the picture; they just orbit the crew */
const CHIP_SPOTS: { style: React.CSSProperties; tilt: string; float: number }[] = [
  { style: { left: "-13%", top: "7%" }, tilt: "-rotate-[5deg]", float: 6.2 },
  { style: { right: "-15%", top: "24%" }, tilt: "rotate-[4deg]", float: 7.4 },
  { style: { left: "-17%", top: "60%" }, tilt: "-rotate-[3deg]", float: 6.8 },
  { style: { right: "-11%", top: "79%" }, tilt: "rotate-[5deg]", float: 8 },
];

export function AboutCrew() {
  const reduce = useReducedMotion();

  return (
    /* overflow-hidden: the paper stack, orb glow, floating chips and the
       thread's overhang all reach past the content box — clip here so the
       page never scrolls sideways, even at 320px */
    <section id="crew" className="relative overflow-hidden px-3 py-24 sm:px-5 sm:py-32">
      <div className="mx-auto max-w-[1340px]">
        {/* ---------------- heading ---------------- */}
        <div className="text-center">
          <Reveal>
            <Eyebrow>The crew</Eyebrow>
          </Reveal>
          <WordReveal
            as="h2"
            text="Four builders, one"
            accent="wavelength."
            accentClass="italic text-gradient-signal"
            className="display mx-auto mt-4 max-w-[18ch] text-balance text-[clamp(2rem,5.5vw,4rem)]"
            delay={80}
          />
          <Reveal delay={160}>
            <p className="mx-auto mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink-3">
              CyberSprinters is the four of us — designing, wiring, and shipping
              agentic products end to end. Same beach, same backlog.
            </p>
          </Reveal>
        </div>

        {/* ---------------- centerpiece photo ---------------- */}
        <Reveal delay={120}>
          <div className="relative mx-auto mt-16 w-full max-w-[440px] sm:mt-20">
            {/* warm halo behind the print */}
            <div aria-hidden className="orb-glow absolute -inset-12 -z-10 opacity-70" />

            <Tilt max={5} className="relative">
              {/* clay stacked-paper sheets behind the photo */}
              <div
                aria-hidden
                className="absolute -left-3 top-4 h-full w-full -rotate-2 rounded-[26px] sm:-left-5 sm:top-6"
                style={{ background: "var(--signal-bright)" }}
              />
              <div
                aria-hidden
                className="absolute -left-1.5 top-2 h-full w-full -rotate-1 rounded-[26px] sm:-left-2.5 sm:top-3"
                style={{ background: "var(--signal-soft)" }}
              />

              {/* the print itself */}
              <div className="group relative overflow-hidden rounded-[26px] border border-line bg-bg-3 shadow-[0_50px_120px_-44px_rgba(40,30,20,0.5)]">
                <Image
                  src="/team/cybersprinters.jpg"
                  alt="The four CyberSprinters together at the beach"
                  width={640}
                  height={640}
                  sizes="(min-width: 640px) 440px, 92vw"
                  className={
                    reduce
                      ? "h-auto w-full object-cover"
                      : "h-auto w-full object-cover grayscale-[0.35] transition-[filter] duration-700 ease-out group-hover:grayscale-0"
                  }
                />

                {/* slow-breathing warm vignette */}
                {reduce ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-70"
                    style={{
                      background:
                        "radial-gradient(120% 105% at 50% 30%, transparent 55%, var(--signal-glow) 125%)",
                      mixBlendMode: "multiply",
                    }}
                  />
                ) : (
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(120% 105% at 50% 30%, transparent 55%, var(--signal-glow) 125%)",
                      mixBlendMode: "multiply",
                    }}
                    animate={{ opacity: [0.55, 0.85, 0.55] }}
                    transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}

                {/* sheen sweep on hover (skipped entirely under reduced motion) */}
                {!reduce && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-y-0 -left-2/3 w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-[1100ms] ease-out group-hover:translate-x-[340%]"
                  />
                )}

                {/* quiet caption chip */}
                <span className="absolute bottom-3 left-3 rounded-full bg-white/85 px-3 py-1 text-[11px] font-medium text-ink-2 shadow-sm backdrop-blur-sm">
                  The whole crew, one frame
                </span>
              </div>
            </Tilt>

            {/* floating name chips orbiting the frame — md+ only */}
            <Stagger className="pointer-events-none absolute inset-0 hidden md:block">
              {MEMBERS.map((m, i) => (
                <div key={m.name} className="absolute" style={CHIP_SPOTS[i].style}>
                  <StaggerItem>
                    <Float amount={reduce ? 0 : 7} duration={CHIP_SPOTS[i].float}>
                      <span
                        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-white/90 px-3.5 py-1.5 text-[12px] font-medium text-ink-2 shadow-[0_12px_28px_-14px_rgba(40,30,20,0.4)] backdrop-blur-sm ${CHIP_SPOTS[i].tilt}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                        {m.name}
                      </span>
                    </Float>
                  </StaggerItem>
                </div>
              ))}
            </Stagger>

            {/* mobile: names as a static wrapped row under the photo */}
            <div className="mt-8 flex flex-wrap justify-center gap-2 md:hidden">
              {MEMBERS.map((m) => (
                <span
                  key={m.name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-ink-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                  {m.name}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ---------------- member panels + thread ---------------- */}
        <div className="relative mt-16 sm:mt-20">
          {/* the clay thread — drawn behind the cards, so it surfaces in the
              gaps between them and runs off both edges: one line, four people */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-10 top-1/2 z-0 hidden h-40 -translate-y-1/2 lg:block"
          >
            <svg viewBox="0 0 1200 160" preserveAspectRatio="none" className="h-full w-full">
              {reduce ? (
                <path
                  d="M0 84 C 90 44, 210 124, 320 84 S 540 44, 640 84 S 860 124, 960 84 S 1160 44, 1200 84"
                  fill="none"
                  stroke="var(--signal)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.55"
                />
              ) : (
                <motion.path
                  d="M0 84 C 90 44, 210 124, 320 84 S 540 44, 640 84 S 860 124, 960 84 S 1160 44, 1200 84"
                  fill="none"
                  stroke="var(--signal)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  opacity="0.55"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true, margin: "0px 0px -15% 0px" }}
                  transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
            </svg>
          </div>

          <Stagger className="relative z-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {MEMBERS.map((m, i) => (
              <StaggerItem key={m.name} className="h-full">
                <MemberCard member={m} index={i} reduce={reduce} />
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        {/* quiet sign-off */}
        <Reveal delay={100}>
          <p className="mt-12 text-center text-[13px] text-ink-3">
            One thread, four hands on it —{" "}
            <Link href="/careers" className="link-underline font-medium text-ink-2">
              there&apos;s room on the line
            </Link>
            .
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  MemberCard — one crew panel. The ghost index drifts against the    */
/*  cursor (springed, disabled for reduced motion; inert on touch      */
/*  since mousemove never fires and a coarse-pointer override pins     */
/*  the transform). The name slides to its clay twin on hover inside   */
/*  its own box, and the accent bar grows within a fixed-height row —  */
/*  nothing on this card changes the layout around it.                 */
/* ------------------------------------------------------------------ */

function MemberCard({
  member,
  index,
  reduce,
}: {
  member: Member;
  index: number;
  reduce: boolean | null;
}) {
  const gx = useMotionValue(0);
  const gy = useMotionValue(0);
  const sx = useSpring(gx, { stiffness: 120, damping: 16, mass: 0.4 });
  const sy = useSpring(gy, { stiffness: 120, damping: 16, mass: 0.4 });

  function onMove(e: React.MouseEvent<HTMLElement>) {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    gx.set(((e.clientX - r.left) / r.width - 0.5) * -20);
    gy.set(((e.clientY - r.top) / r.height - 0.5) * -14);
  }
  function onLeave() {
    gx.set(0);
    gy.set(0);
  }

  const num = String(index + 1).padStart(2, "0");

  return (
    <article
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="group card-interactive relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface p-6"
    >
      {/* giant ghost index, parallax-drifting against the cursor */}
      <motion.span
        aria-hidden
        style={reduce ? undefined : { x: sx, y: sy }}
        className="pointer-events-none absolute -right-2 -top-7 select-none font-sans text-[96px] font-semibold leading-none tracking-tighter text-ink/[0.05] [@media(pointer:coarse)]:!transform-none"
      >
        {num}
      </motion.span>

      <div className="relative flex h-full flex-col">
        {/* clay gradient avatar with a glassy glint */}
        <span
          className="sheen relative flex h-14 w-14 items-center justify-center rounded-full text-[15px] font-semibold text-white shadow-[0_14px_30px_-14px_var(--signal-glow)]"
          style={{
            background:
              "linear-gradient(135deg, var(--signal-deep), var(--signal) 55%, var(--signal-bright))",
          }}
        >
          <span
            aria-hidden
            className="absolute left-2 top-1.5 h-2.5 w-5 -rotate-12 rounded-full bg-white/45 blur-[1px]"
          />
          {member.initials}
        </span>

        {/* name — the resting ink copy slides up and its clay twin slides in;
            the twin is absolute over the first copy, so wrapped long names
            keep their exact height and nothing reflows */}
        <h3 className="relative mt-5 overflow-hidden text-[19px] font-semibold leading-snug tracking-tight text-ink-display">
          {reduce ? (
            <span className="block">{member.name}</span>
          ) : (
            <>
              <span className="block transition-transform duration-500 [transition-timing-function:var(--ease-soft)] group-hover:-translate-y-full">
                {member.name}
              </span>
              <span
                aria-hidden
                className="absolute inset-0 block translate-y-full text-signal-deep transition-transform duration-500 [transition-timing-function:var(--ease-soft)] group-hover:translate-y-0"
              >
                {member.name}
              </span>
            </>
          )}
        </h3>

        <span className="mt-2.5 self-start rounded-full bg-signal-soft px-2.5 py-1 text-[11px] font-medium text-signal-deep">
          CyberSprinter
        </span>

        <p className="mt-3 flex-1 text-[14px] leading-relaxed text-ink-3">
          {member.line}
        </p>

        {/* accent bar — fixed-height row, only the width animates */}
        <span aria-hidden className="mt-6 block h-[3px] w-full">
          <span
            className={`block h-full rounded-full bg-signal ${
              reduce
                ? "w-10"
                : "w-10 transition-[width] duration-500 [transition-timing-function:var(--ease-soft)] group-hover:w-full"
            }`}
          />
        </span>
      </div>
    </article>
  );
}
