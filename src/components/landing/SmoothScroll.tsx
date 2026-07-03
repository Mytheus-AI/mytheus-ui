"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/* SmoothScroll — Lenis inertia smoothing for the landing page. The page's
   choreography (hero filmstrip, LiveCapture conveyor, scrub reveals) is all
   scroll-linked, so easing the scroll itself is what makes those sequences
   read as one continuous camera move instead of wheel-stepped jumps.
   Renders nothing; skipped entirely under prefers-reduced-motion. */

/* the live instance, exported so programmatic scrolls (PinnedScene's spine
   buttons) ride the same easing instead of fighting it */
export let lenis: Lenis | null = null;

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    lenis = new Lenis({
      lerp: 0.11,
      wheelMultiplier: 1,
      anchors: true, // in-page #product / #how links glide through Lenis
    });

    const instance = lenis;
    let raf = requestAnimationFrame(function loop(time: number) {
      instance.raf(time);
      raf = requestAnimationFrame(loop);
    });

    return () => {
      cancelAnimationFrame(raf);
      instance.destroy();
      if (lenis === instance) lenis = null;
    };
  }, []);

  return null;
}
