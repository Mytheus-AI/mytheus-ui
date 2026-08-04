"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MaskReveal } from "./motion";
import { lenis } from "./SmoothScroll";
import { LogoMark } from "@/components/Logo";
import { FEATURES } from "@/lib/marketing/features";

/* Footer — a dramatic warm-dark stage that closes the cream site: a warm clay
   horizon glow, tidy link columns + a working email capture, and a giant
   clay-gradient "Mytheus" wordmark as the centrepiece. Reduced-motion safe
   (reveals / gradient all guard). */

/* five tidy columns — the feature pages split into what the agents do vs.
   what the platform provides, so no single column becomes a wall of links */
const AGENT_SLUGS = [
  "personal-agent",
  "live-notes",
  "smart-questions",
  "decisions",
  "action-items",
  "context-gaps",
  "proactive-insights",
];

const featureLinks = (slugs: string[]) =>
  FEATURES.filter((f) => slugs.includes(f.slug)).map((f) => ({
    label: f.nav,
    href: `/features/${f.slug}`,
  }));

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "/#product" },
      { label: "How it works", href: "/#how" },
      { label: "Pricing", href: "/pricing" },
      { label: "Enterprise", href: "/enterprise" },
      { label: "Students", href: "/students" },
    ],
  },
  {
    title: "Your agent",
    links: featureLinks(AGENT_SLUGS),
  },
  {
    title: "Platform",
    links: [
      ...featureLinks(["transcription", "search", "knowledge-graph", "integrations"]),
      { label: "All features", href: "/features" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "/blog" },
      { label: "Careers", href: "/careers" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Security", href: "/security" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

const SOCIALS: { label: string; href: string; path: string }[] = [
  {
    label: "X",
    href: "https://x.com/RepriseAI",
    path: "M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.6.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/reprise-ai",
    path: "M13.632 13.635h-2.37V9.922c0-.886-.018-2.025-1.234-2.025-1.235 0-1.424.964-1.424 1.96v3.778h-2.37V6h2.275v1.04h.032c.317-.6 1.091-1.234 2.246-1.234 2.4 0 2.845 1.58 2.845 3.637v4.192ZM3.558 4.955a1.376 1.376 0 1 1 0-2.752 1.376 1.376 0 0 1 0 2.752Zm1.188 8.68H2.369V6h2.377v7.635ZM14.816 0H1.18C.528 0 0 .516 0 1.153v13.694C0 15.484.528 16 1.18 16h13.635c.652 0 1.185-.516 1.185-1.153V1.153C16 .516 15.467 0 14.816 0Z",
  },
];

export function SiteFooter() {
  const reduce = useReducedMotion();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSent(true);
  };

  /* ride Lenis when it's mounted (landing page) — a native smooth scrollTo
     fights Lenis's own frame loop and stalls partway up the page */
  const toTop = () => {
    if (lenis) lenis.scrollTo(0, { duration: 1.6 });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const year = new Date().getFullYear();

  return (
    <footer className="relative isolate overflow-hidden rounded-t-[2.5rem] bg-pill text-bg">
      {/* warm horizon glow rising behind the giant wordmark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[60%]"
        style={{
          background:
            "radial-gradient(75% 95% at 50% 100%, var(--signal-glow), transparent 72%)",
        }}
      />
      {/* machined clay hairline where the cream page meets the dark slab */}
      <span
        aria-hidden
        className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-signal/40 to-transparent"
      />

      <div className="relative z-10 mx-auto max-w-[1340px] px-6 pb-8 pt-20 sm:px-10 sm:pt-24">
        {/* band one — brand story left, email capture right */}
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          {/* brand + socials */}
          <div>
            <p className="group flex items-center gap-2 text-[28px] font-medium tracking-[-0.05em] text-bg">
              <LogoMark size={30} />
              Mytheus
            </p>
            <p className="mt-4 max-w-[34ch] text-sm leading-relaxed text-bg/55">
              Every meeting, on repeat. A personal AI agent for everyone in the
              room — capturing decisions, actions, and memory as you talk.
            </p>
            <div className="mt-6 flex items-center gap-2.5">
              {SOCIALS.map((s) => (
                <Link
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-bg/70 transition-[transform,border-color,color] duration-300 hover:-translate-y-0.5 hover:border-signal hover:text-bg motion-reduce:hover:translate-y-0"
                >
                  <svg viewBox="0 0 16 16" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
                    <path d={s.path} />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          {/* email capture */}
          <div className="w-full max-w-[400px]">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bg/40">
              Stay in the loop
            </p>
            {/* the swap crossfades (150ms, 4px lift) instead of snapping;
                the check draws itself — the confirmation's one attention
                moment. Reduced motion: opacity-only, instant, static path. */}
            <AnimatePresence mode="wait" initial={false}>
              {sent ? (
                <motion.div
                  key="sent"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={{ duration: reduce ? 0 : 0.15, ease: "easeOut" }}
                  className="mt-5 flex items-start gap-3 rounded-card border border-signal/40 bg-signal/15 px-5 py-4"
                >
                  <span
                    aria-hidden
                    className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-signal text-white"
                  >
                    <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" aria-hidden>
                      <motion.path
                        d="M4 10.5l3.5 3.5L16 5.5"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={reduce ? false : { pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={
                          reduce
                            ? { duration: 0 }
                            : {
                                duration: 0.4,
                                ease: [0.16, 1, 0.3, 1],
                                delay: 0.15,
                              }
                        }
                      />
                    </svg>
                  </span>
                  <p className="text-sm text-bg/80">
                    You&rsquo;re on the list. We&rsquo;ll be in touch.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="capture"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={{ duration: reduce ? 0 : 0.15, ease: "easeOut" }}
                >
                  <form
                    onSubmit={onSubmit}
                    className="mt-5 flex items-center justify-between rounded-pill border border-white/15 bg-white/5 py-1.5 pl-5 pr-1.5 backdrop-blur-sm transition-[transform,box-shadow,border-color,background-color] duration-300 focus-within:-translate-y-0.5 focus-within:border-signal/50 focus-within:bg-white/10 focus-within:shadow-[0_18px_42px_-24px_var(--signal-glow)] motion-reduce:focus-within:translate-y-0"
                  >
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@work.com"
                      aria-label="Email address"
                      className="w-full bg-transparent text-[15px] text-bg outline-none placeholder:text-bg/40"
                    />
                    <button
                      type="submit"
                      disabled={!valid}
                      className="shrink-0 rounded-pill bg-signal px-4 py-2 text-sm font-medium text-white transition-[transform,background-color,box-shadow,opacity] duration-300 hover:-translate-y-0.5 hover:bg-signal-bright hover:shadow-[0_12px_24px_-12px_var(--signal-glow)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:bg-signal disabled:hover:shadow-none motion-reduce:hover:translate-y-0"
                    >
                      Join
                    </button>
                  </form>
                  <p className="mt-3 text-xs text-bg/40">
                    Product news, no noise. Unsubscribe anytime.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* band two — the link columns, airy and even */}
        <div className="mt-14 grid grid-cols-2 gap-x-8 gap-y-10 border-t border-white/10 pt-10 sm:grid-cols-3 lg:grid-cols-5">
          {COLS.map((col) => (
            <div key={col.title}>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-bg/40">
                {col.title}
              </p>
              <ul className="mt-4 space-y-1.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="relative inline-block py-1 text-[13.5px] leading-snug text-bg/60 transition-colors duration-300 hover:text-bg after:absolute after:bottom-0.5 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-signal after:transition-transform after:duration-300 after:ease-out hover:after:origin-left hover:after:scale-x-100 motion-reduce:after:transition-none"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* bottom bar */}
        <div className="mt-16 flex flex-col items-center gap-4 border-t border-white/10 pt-6 sm:flex-row sm:justify-between">
          <p className="order-2 text-xs text-bg/45 sm:order-1">
            © {year} Mytheus. All rights reserved.
          </p>
          <button
            type="button"
            onClick={toTop}
            className="group order-1 inline-flex min-h-[40px] items-center gap-1.5 text-xs font-medium text-bg/60 transition-colors hover:text-bg sm:order-2"
          >
            Back to top
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:group-hover:translate-y-0"
            >
              ↑
            </span>
          </button>
        </div>
      </div>

      {/* the centrepiece — a giant clay-gradient wordmark GROUNDED on the
          footer's bottom edge: the negative bottom margin pulls the line box
          down so the BASELINE sits exactly on the edge (every letter touches
          the ground, no gap) and the footer's overflow-hidden crops the "y"
          descender below the ground line. No Parallax — it would float the
          letters off the ground. */}
      <div className="pointer-events-none relative z-[1]">
        <MaskReveal y={160}>
          {/* set in the BRAND face (Refinity, the .wordmark class — same as
              the loader). Bottom-aligned logotype treatment: -mb (from
              Refinity's metrics: baseline 0.135em above the leading-none box
              bottom, flat letters paint 0.01em below baseline) grounds every
              letter's foot exactly on the footer edge, and the y is raised
              by its tail depth (0.17 − 0.01 em) so its tail tip sits on the
              SAME ground line as the other letters — whole glyph visible,
              no gap, one shared bottom edge. */}
          <p className="wordmark text-gradient-signal -mb-[0.125em] select-none whitespace-nowrap text-center text-[clamp(4rem,24vw,23rem)] leading-none tracking-[-0.02em]">
            {/* vertical-align (not translate): a transform on the span would
                break the parent's background-clip:text and render the y
                invisible */}
            M<span className="inline-block align-[0.16em]">y</span>theus
          </p>
        </MaskReveal>
      </div>
    </footer>
  );
}
