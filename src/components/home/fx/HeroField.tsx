"use client";

import dynamic from "next/dynamic";
import { PALETTE } from "@/components/home/fx/theme";

/* The hero's background: React Bits GradientASCII as published
   (reactbits.dev/backgrounds/gradient-ascii), every setting at its default except the two colours,
   which are ours: deep clay coral running to bright coral, in place of the demo's blue and white,
   so the whole field reads orange rather than washing out to white.
   The hero is dark in both themes (it carries `.mx-dark`), so the field always runs as the demo
   does, on the dark palette. Client only (WebGL); before it loads, the hero's own ground shows. */
const GradientASCII = dynamic(() => import("@/components/reactbits/GradientASCII"), { ssr: false });

export function HeroField() {
  const c = PALETTE.dark;
  return <GradientASCII aria-hidden className="absolute inset-0" lightMode={false} colors={[c.signalDeep, c.signal]} />;
}
