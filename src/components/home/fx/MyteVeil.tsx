"use client";

import dynamic from "next/dynamic";
import { PALETTE, useSiteTheme } from "@/components/home/fx/theme";

/* A Myte's portrait printed as a coral dither (React Bits DitherVeil). Where the pointer goes,
   the print clears and the full-colour render shows through; idle, the clearing wanders by
   itself so the portrait is never fully hidden. Reduced motion stops the wandering. */
const DitherVeil = dynamic(() => import("@/components/reactbits/DitherVeil"), { ssr: false });

export function MyteVeil({ src }: { src: string }) {
  const theme = useSiteTheme();
  const c = PALETTE[theme];
  return (
    <DitherVeil
      src={src}
      fit="cover"
      pattern="atkinson"
      pixelSize={3}
      levels={2}
      palette="duotone"
      inkColor={theme === "light" ? c.signalDeep : c.signal}
      paperColor={theme === "light" ? c.signalSoft : c.surface}
      contrast={1.25}
      brightness={theme === "light" ? 0.06 : 0}
      revealRadius={150}
      softness={0.7}
      linger={1.4}
      rimColor={c.signalLine}
      rim={0.5}
      wander
      clickBurst
    />
  );
}
