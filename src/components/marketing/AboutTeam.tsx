"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Reveal,
  WordReveal,
  MaskReveal,
  Stagger,
  StaggerItem,
  Marquee,
  Tilt,
  Magnetic,
  Float,
} from "@/components/landing/motion";
import { Eyebrow, ArrowRight } from "@/components/landing/ui";

/* ================================================================== */
/*  AboutTeam — the CyberSprinters page. A cinematic team intro in the  */
/*  landing's motion language: word-by-word hero, a name marquee, the   */
/*  team photo on a tilting card with floating name chips, and four     */
/*  member cards that deal in like a hand of cards. Every primitive     */
/*  already guards reduced motion.                                      */
/* ================================================================== */

const TEAM = [
  { name: "Sushan Shetty", n: "01" },
  { name: "Samar Rihan", n: "02" },
  { name: "Shaun Marvell Rodrigues", n: "03" },
  { name: "Yash V Maurya", n: "04" },
];

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

const EASE = [0.16, 1, 0.3, 1] as const;

export function AboutTeam() {
  const reduce = useReducedMotion();

  return (
    <div className="overflow-hidden">
      {/* ---- hero — the name arrives word by word ---- */}
      {/* PageShell's header is sticky (in flow), so the hero needs only its
          own breathing room — no fixed-header clearance */}
      <section className="mesh-field mesh-anim grain relative px-6 pb-16 pt-20 text-center sm:px-8 sm:pb-20 sm:pt-28">
        <Reveal>
          <Eyebrow>The team behind Mytheus</Eyebrow>
        </Reveal>
        <WordReveal
          as="h1"
          text="We are"
          accent="CyberSprinters."
          accentClass="text-gradient-signal"
          className="display display-tight mx-auto mt-5 max-w-[14ch] text-balance text-[clamp(2.6rem,8vw,6.5rem)]"
          delay={120}
        />
        <Reveal delay={300}>
          <p className="mx-auto mt-6 max-w-[46ch] text-[16px] leading-relaxed text-ink-3 sm:text-[18px]">
            Four builders, one shared memory. We sprint, ship, and teach
            software to listen — Mytheus is what we&apos;re building together.
          </p>
        </Reveal>
      </section>

      {/* ---- the name, on repeat — an endless ribbon ---- */}
      <div className="border-y border-line/70 bg-bg-2/50 py-4">
        <Marquee>
          {TEAM.map((m) => (
            <span
              key={m.name}
              className="mx-6 inline-flex items-center gap-6 whitespace-nowrap font-mono text-[13px] uppercase tracking-[0.3em] text-ink-3"
            >
              {m.name}
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-signal" />
            </span>
          ))}
        </Marquee>
      </div>

      {/* ---- the photo — one frame, four name chips orbiting it ---- */}
      <section className="relative mx-auto max-w-[1100px] px-6 py-20 sm:px-8 sm:py-24">
        <MaskReveal y={80}>
          <Tilt max={4} className="relative mx-auto max-w-[640px]">
            {/* clay echo cards behind the frame */}
            <div
              aria-hidden
              className="absolute -left-3 top-4 h-full w-full rounded-[28px] bg-signal-bright sm:-left-5 sm:top-6"
            />
            <div
              aria-hidden
              className="absolute -left-1.5 top-2 h-full w-full rounded-[28px] bg-signal-soft sm:-left-2.5 sm:top-3"
            />
            <div className="relative overflow-hidden rounded-[28px] border border-line shadow-[0_60px_120px_-40px_rgba(40,30,20,0.5)]">
              <Image
                src="/team/cybersprinters.jpg"
                alt="The four CyberSprinters together at the beach"
                width={640}
                height={640}
                priority
                className="h-auto w-full"
              />
              {/* warm vignette so the frame sits in the cream page */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(40,30,20,0.28), transparent 38%)",
                }}
              />
              <span className="absolute bottom-4 left-5 font-mono text-[11px] uppercase tracking-[0.3em] text-white/85">
                CyberSprinters · est. together
              </span>
            </div>

            {/* floating name chips — each drifts on its own rhythm */}
            <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
              {[
                { m: TEAM[0], cls: "-left-24 top-6", d: 3.2 },
                { m: TEAM[1], cls: "-right-24 top-20", d: 3.8 },
                { m: TEAM[2], cls: "-left-28 bottom-24", d: 4.2 },
                { m: TEAM[3], cls: "-right-20 -bottom-4", d: 3.5 },
              ].map(({ m, cls, d }, i) => (
                <motion.div
                  key={m.name}
                  className={`absolute ${cls}`}
                  initial={reduce ? false : { opacity: 0, y: 14, scale: 0.9 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.6,
                    ease: EASE,
                    delay: 0.35 + i * 0.12,
                  }}
                >
                  <Float amount={5} duration={d}>
                    <span className="inline-flex items-center gap-2 rounded-pill border border-line bg-white/90 py-1.5 pl-2 pr-3.5 text-[12.5px] font-medium text-ink-2 shadow-[0_18px_40px_-22px_rgba(40,30,20,0.5)] backdrop-blur-sm">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-signal-soft font-mono text-[9px] font-semibold text-signal-deep">
                        {initials(m.name)}
                      </span>
                      {m.name.split(" ")[0]}
                    </span>
                  </Float>
                </motion.div>
              ))}
            </div>
          </Tilt>
        </MaskReveal>
      </section>

      {/* ---- the four — cards deal in, one beat apart ---- */}
      <section className="mx-auto max-w-[1340px] px-6 pb-20 sm:px-8 sm:pb-24">
        <Reveal className="text-center">
          <Eyebrow>The sprinters</Eyebrow>
          <h2 className="display mx-auto mt-4 max-w-[22ch] text-balance text-[clamp(1.9rem,4vw,3rem)]">
            Say hi to the four of us.
          </h2>
        </Reveal>

        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {TEAM.map((m) => (
            <StaggerItem key={m.name} className="h-full">
              <Tilt max={6} className="h-full">
                <div className="card-interactive group relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-white p-6">
                  {/* giant ghost number, rising on hover */}
                  <span
                    aria-hidden
                    className="display pointer-events-none absolute -right-2 -top-7 text-[6rem] leading-none text-signal/[0.08] transition-transform duration-500 group-hover:-translate-y-1.5"
                  >
                    {m.n}
                  </span>

                  {/* clay avatar with a glassy glint */}
                  <span
                    className="relative grid h-14 w-14 place-items-center rounded-full text-[15px] font-semibold text-white"
                    style={{
                      background:
                        "radial-gradient(circle at 32% 30%, var(--signal-bright), var(--signal) 58%, var(--signal-deep))",
                    }}
                  >
                    <span
                      aria-hidden
                      className="absolute left-[18%] top-[14%] h-[26%] w-[26%] rounded-full bg-white/70 blur-[1px]"
                    />
                    <span className="relative">{initials(m.name)}</span>
                  </span>

                  <h3 className="mt-5 text-[18px] font-medium tracking-tight text-ink">
                    {m.name}
                  </h3>
                  <p className="kicker mt-1.5 text-[10px] text-signal-deep">
                    CyberSprinter · {m.n} of 04
                  </p>
                  <p className="mt-4 text-[14px] leading-relaxed text-ink-3">
                    Builds Mytheus end to end — from the cream-and-clay pixels
                    to the agents that remember every meeting.
                  </p>
                </div>
              </Tilt>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* ---- closing ---- */}
      <section className="mx-auto max-w-[1340px] px-6 pb-24 sm:px-8 sm:pb-28">
        <Reveal>
          <div className="mesh-field mesh-anim grain relative overflow-hidden rounded-[28px] border border-line px-8 py-16 text-center sm:py-20">
            <p className="kicker text-signal-deep">Built in sprints, remembered forever</p>
            <h2 className="display mx-auto mt-4 max-w-[18ch] text-balance text-[clamp(1.9rem,4.4vw,3.4rem)]">
              Now see what we&apos;re building.
            </h2>
            <div className="mt-9">
              <Magnetic strength={0.3}>
                <Link
                  href="/"
                  className="group inline-flex items-center gap-2.5 rounded-pill bg-signal py-3.5 pl-7 pr-6 text-[15px] font-medium text-white shadow-[0_20px_44px_-18px_rgba(189,93,58,0.85)] transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-signal-deep"
                >
                  Explore Mytheus
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </Magnetic>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
