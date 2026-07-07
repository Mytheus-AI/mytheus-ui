"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sidebar } from "@/components/app/Sidebar";
import { Topbar } from "@/components/app/Topbar";

/* The authenticated shell: on desktop the nav is a fixed left column; below
   lg it collapses into an overlay drawer opened from the Topbar hamburger.
   Route changes, Escape, overlay click, and nav clicks all close the drawer.
   Drawer motion is calm (150 ms fade + short slide) and degrades to instant
   opacity under prefers-reduced-motion. */

const EASE_OUT: [number, number, number, number] = [0.2, 0.7, 0.2, 1];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const drawerTransition = {
    duration: reduceMotion ? 0 : 0.15,
    ease: EASE_OUT,
  };

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  /* lock the page scroll behind the drawer */
  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar className="hidden lg:flex" />

      <AnimatePresence>
        {navOpen && (
          <div
            className="fixed inset-0 z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <motion.button
              type="button"
              aria-label="Close navigation"
              onClick={() => setNavOpen(false)}
              className="absolute inset-0 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={drawerTransition}
            />
            <motion.div
              className="relative z-10 h-full w-64"
              initial={{ opacity: 0, x: reduceMotion ? 0 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduceMotion ? 0 : -20 }}
              transition={drawerTransition}
            >
              <Sidebar
                className="flex shadow-[0_24px_60px_-24px_rgba(40,30,20,0.5)]"
                onNavigate={() => setNavOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setNavOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
