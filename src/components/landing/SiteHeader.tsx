"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { LogoMark } from "@/components/Logo";

/* Just the wordmark, floating transparent over the page (links home / back to
   top). No nav bar, no CTA. */

const EASE = [0.2, 0.7, 0.2, 1] as const;

export function SiteHeader() {
  const reduce = useReducedMotion();

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-[1380px] items-center px-6 py-5 sm:px-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -10 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.05 }}
        >
          <Link
            href="/"
            className="pointer-events-auto inline-flex items-center gap-2 text-[26px] font-medium tracking-[-0.05em] text-ink transition-opacity hover:opacity-70"
          >
            <LogoMark size={28} />
            Mytheus
          </Link>
        </motion.div>
      </div>
    </header>
  );
}
