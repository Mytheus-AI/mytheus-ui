"use client";

import { useState } from "react";
import Link from "next/link";
import { MaskReveal, Parallax } from "./motion";
import { LogoMark } from "@/components/Logo";

/* Footer — a dramatic warm-dark stage that closes the cream site: a warm clay
   horizon glow, tidy link columns + a working email capture, and a giant
   clay-gradient "Mytheus" wordmark as the centrepiece. Reduced-motion safe
   (reveals / gradient all guard). */

const COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Overview", href: "/#product" },
      { label: "How it works", href: "/#how" },
      { label: "Enterprise", href: "/enterprise" },
      { label: "Students", href: "/students" },
    ],
  },
  {
    title: "Company",
    links: [
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
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSent(true);
  };

  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

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

      <div className="relative z-10 mx-auto max-w-[1340px] px-6 pb-8 pt-20 sm:px-10 sm:pt-24">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-4 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1.5fr]">
          {/* brand + socials */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <p className="flex items-center gap-2 text-[28px] font-medium tracking-[-0.05em] text-bg">
              <LogoMark size={30} />
              Mytheus
            </p>
            <p className="mt-4 max-w-[30ch] text-sm leading-relaxed text-bg/55">
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
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-bg/70 transition-[transform,border-color,color] duration-300 hover:-translate-y-0.5 hover:border-signal hover:text-bg"
                >
                  <svg viewBox="0 0 16 16" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
                    <path d={s.path} />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          {/* link columns */}
          {COLS.map((col) => (
            <div key={col.title}>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bg/40">
                {col.title}
              </p>
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="relative inline-block text-[15px] text-bg/65 transition-colors hover:text-bg after:absolute after:-bottom-0.5 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-signal after:transition-transform after:duration-300 after:ease-out hover:after:scale-x-100"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* email capture */}
          <div className="col-span-2 md:col-span-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bg/40">
              Stay in the loop
            </p>
            {sent ? (
              <div className="mt-5 flex items-start gap-3 rounded-card border border-signal/40 bg-signal/15 px-5 py-4">
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-signal text-white"
                >
                  <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" aria-hidden>
                    <path
                      d="M4 10.5l3.5 3.5L16 5.5"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <p className="text-sm text-bg/80">
                  You&rsquo;re on the list. We&rsquo;ll be in touch.
                </p>
              </div>
            ) : (
              <>
                <form
                  onSubmit={onSubmit}
                  className="mt-5 flex items-center justify-between rounded-pill border border-white/15 bg-white/5 py-1.5 pl-5 pr-1.5 backdrop-blur-sm transition-[transform,box-shadow,border-color,background-color] duration-300 focus-within:-translate-y-0.5 focus-within:border-signal/50 focus-within:bg-white/10 focus-within:shadow-[0_18px_42px_-24px_rgba(217,119,87,0.7)]"
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
                    className="shrink-0 rounded-pill bg-signal px-4 py-2 text-sm font-medium text-white transition-[transform,background-color,box-shadow,opacity] duration-300 hover:-translate-y-0.5 hover:bg-signal-bright hover:shadow-[0_12px_24px_-12px_rgba(217,119,87,0.9)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:bg-signal disabled:hover:shadow-none"
                  >
                    Join
                  </button>
                </form>
                <p className="mt-3 text-xs text-bg/40">
                  Product news, no noise. Unsubscribe anytime.
                </p>
              </>
            )}
          </div>
        </div>

        {/* bottom bar */}
        <div className="mt-16 flex flex-col items-center gap-4 border-t border-white/10 pt-6 sm:flex-row sm:justify-between">
          <p className="order-2 text-xs text-bg/45 sm:order-1">
            © {year} Mytheus. All rights reserved.
          </p>
          <button
            type="button"
            onClick={toTop}
            className="group order-1 inline-flex items-center gap-1.5 text-xs font-medium text-bg/60 transition-colors hover:text-bg sm:order-2"
          >
            Back to top
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:-translate-y-0.5"
            >
              ↑
            </span>
          </button>
        </div>
      </div>

      {/* the centrepiece — a giant clay-gradient wordmark, bottom-anchored and
          gently bleeding off the edge */}
      <Parallax distance={16} className="pointer-events-none relative z-[1] -mb-[1.2vw]">
        <MaskReveal y={160}>
          <p className="display text-gradient-signal select-none px-2 text-center text-[clamp(5rem,27vw,24rem)] leading-[0.82] tracking-[-0.045em]">
            Mytheus
          </p>
        </MaskReveal>
      </Parallax>
    </footer>
  );
}
