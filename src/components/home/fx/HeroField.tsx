"use client";

import dynamic from "next/dynamic";
import { PALETTE, useSiteTheme } from "@/components/home/fx/theme";

/* The hero's background: React Bits GradientASCII as published
   (reactbits.dev/backgrounds/gradient-ascii), every setting at its default except the two colours,
   which are ours: deep clay coral running to bright coral, in place of the demo's blue and white,
   so the whole field reads orange rather than washing out to white.
   The light theme runs it in its light mode on cream; the dark theme runs it as the demo does.
   Client only (WebGL); before it loads, the hero's own ground shows. */
const GradientASCII = dynamic(() => import("@/components/reactbits/GradientASCII"), { ssr: false });

export function HeroField() {
  const theme = useSiteTheme();
  const c = PALETTE[theme];
  return (
    <GradientASCII
      aria-hidden
      className="absolute inset-0"
      lightMode={theme === "light"}
      colors={theme === "light" ? [c.signalDeep, c.signalLine] : [c.signalDeep, c.signal]}
    />
  );
}
