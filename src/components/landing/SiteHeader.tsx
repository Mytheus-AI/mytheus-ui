"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { ArrowRight } from "./ui";
import { FEATURES } from "@/lib/marketing/features";

/* The wordmark, floating transparent over the page (links home / back to
   top), with a centered product nav: a Features menu (all feature pages),
   Pricing, and Enterprise. Once you scroll past the first screen the pills
   earn a soft backdrop for legibility and a compact "Get started" pill fades
   in on the right — the CTA is always one glance away without ever crowding
   the hero. */

const EASE = [0.2, 0.7, 0.2, 1] as const;

export function SiteHeader() {
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > window.innerHeight * 0.75);
  });

  const pillSurface = scrolled
    ? "bg-bg/75 shadow-[0_10px_30px_-18px_rgba(40,30,20,0.4)] backdrop-blur-md"
    : "bg-transparent";

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-[1380px] items-center justify-between px-6 py-5 sm:px-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -10 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.05 }}
        >
          <Link
            href="/"
            className={`group pointer-events-auto inline-flex items-center gap-2 rounded-pill text-[26px] font-medium tracking-[-0.05em] text-ink transition-[background-color,box-shadow,padding] duration-500 ${
              scrolled ? `py-1.5 pl-2.5 pr-4 ${pillSurface}` : "bg-transparent"
            }`}
          >
            {/* the mark fades in and draws itself (the stroke animation in
                Logo.tsx / globals.css is the real entrance) */}
            <motion.span
              className="inline-flex"
              initial={reduce ? false : { opacity: 0, scale: 0.92 }}
              animate={reduce ? undefined : { opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: EASE, delay: 0.05 }}
            >
              <LogoMark size={28} />
            </motion.span>
            Mytheus
          </Link>
        </motion.div>

        {/* centered product nav — desktop only */}
        <motion.nav
          aria-label="Product"
          initial={reduce ? false : { opacity: 0, y: -10 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.12 }}
          className={`pointer-events-auto hidden items-center gap-1 rounded-pill px-2 py-1.5 transition-[background-color,box-shadow] duration-500 md:flex ${pillSurface}`}
        >
          <FeaturesMenu reduce={!!reduce} />
          <NavLink href="/pricing">Pricing</NavLink>
          <NavLink href="/enterprise">Enterprise</NavLink>
        </motion.nav>

        {/* compact CTA — arrives once the hero's own CTA has scrolled away */}
        <motion.div
          initial={false}
          animate={
            reduce
              ? { opacity: scrolled ? 1 : 0 }
              : { opacity: scrolled ? 1 : 0, y: scrolled ? 0 : -8 }
          }
          transition={{ duration: 0.45, ease: EASE }}
        >
          <Link
            href="/dashboard"
            tabIndex={scrolled ? 0 : -1}
            aria-hidden={!scrolled}
            className={`group inline-flex items-center gap-2 rounded-pill bg-signal py-2.5 pl-5 pr-4 text-[14px] font-medium text-white shadow-[0_16px_36px_-18px_rgba(189,93,58,0.8)] transition-[background-color,transform] duration-300 hover:-translate-y-0.5 hover:bg-signal-deep ${
              scrolled ? "pointer-events-auto" : "pointer-events-none"
            }`}
          >
            Get started free
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-pill px-3.5 py-2 text-[14px] font-medium text-ink-2 transition-colors duration-300 hover:text-ink"
    >
      {children}
    </Link>
  );
}

/* the Features dropdown — hover or click to open, Escape / outside-click to
   close, links keyboard-reachable in order */
function FeaturesMenu({ reduce }: { reduce: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-pill px-3.5 py-2 text-[14px] font-medium text-ink-2 transition-colors duration-300 hover:text-ink"
      >
        Features
        <svg
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden
          className={`h-3.5 w-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="absolute left-1/2 top-full z-50 w-[560px] -translate-x-1/2 pt-3"
          >
            <div className="overflow-hidden rounded-[20px] border border-line bg-bg/95 p-3 shadow-[0_40px_80px_-32px_rgba(40,30,20,0.4)] backdrop-blur-md">
              <div className="grid grid-cols-2 gap-0.5">
                {FEATURES.map((f) => (
                  <Link
                    key={f.slug}
                    href={`/features/${f.slug}`}
                    onClick={() => setOpen(false)}
                    className="rounded-xl px-3.5 py-2.5 transition-colors duration-200 hover:bg-bg-2"
                  >
                    <span className="block text-[13.5px] font-medium tracking-tight text-ink">
                      {f.nav}
                    </span>
                    <span className="mt-0.5 block truncate text-[11.5px] text-ink-3">
                      {f.blurb}
                    </span>
                  </Link>
                ))}
              </div>
              <Link
                href="/features"
                onClick={() => setOpen(false)}
                className="mt-1.5 flex items-center justify-between rounded-xl bg-bg-2/70 px-3.5 py-2.5 text-[13px] font-medium text-signal-deep transition-colors duration-200 hover:bg-signal-soft"
              >
                All features
                <span aria-hidden>→</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
