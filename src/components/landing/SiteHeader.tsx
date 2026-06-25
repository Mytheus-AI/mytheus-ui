"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CTAButton } from "./motion";

/** Logomark: an uppercase R with two connected nodes stacked to its right. */
function Logomark() {
  return (
    <span className="flex items-center text-signal" aria-hidden>
      <span className="text-[1.5rem] font-bold leading-none tracking-tight">R</span>
      <svg width="11" height="24" viewBox="0 0 12 26" fill="none" className="ml-[1px]">
        <line x1="6" y1="8" x2="6" y2="18" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="6" cy="6.6" r="2.5" fill="currentColor" />
        <circle cx="6" cy="19.4" r="2.5" fill="currentColor" />
      </svg>
    </span>
  );
}

const NAV = [
  { label: "How it works", href: "#how" },
  { label: "Features", href: "#features" },
];

/**
 * Minimal landing header: brand wordmark (links home) on the left,
 * in-page nav in the center, Log in + Sign up on the right.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-paper/80 backdrop-blur-xl transition-shadow duration-500 ${
        scrolled
          ? "border-b border-line shadow-[0_1px_24px_-12px_rgba(24,19,31,0.25)]"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[80rem] items-center justify-between gap-2 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="Reprise — home"
          className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
        >
          <Logomark />
          <span className="font-logo text-[1.25rem] leading-none tracking-[0.01em] text-ink sm:text-[1.4rem]">
            Reprise<span className="text-signal">.</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="link-underline text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href="/sign-in"
            className="link-underline rounded-full px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink sm:px-4"
          >
            Log in
          </Link>
          <CTAButton href="/sign-up" className="px-4 py-2.5 sm:px-5">
            Sign up
          </CTAButton>
        </div>
      </div>
    </header>
  );
}
