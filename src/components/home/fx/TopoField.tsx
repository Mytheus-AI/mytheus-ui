"use client";

import dynamic from "next/dynamic";
import { PALETTE, useSiteTheme } from "@/components/home/fx/theme";

/* The closing ground: contour lines of a slowly shifting terrain (React Bits Topography) in the
   coral line colour. Each meeting lays down another contour; the pointer traces the line under
   it and a click sends a pulse across the map. */
const Topography = dynamic(() => import("@/components/reactbits/Topography"), { ssr: false });

export function TopoField() {
  const theme = useSiteTheme();
  const c = PALETTE[theme];
  return (
    <Topography
      className="absolute inset-0"
      color={c.signalLine}
      lightMode={theme === "light"}
      lineCount={26}
      lineWidth={1.15}
      majorLines
      elevation={1.1}
      detail={0.4}
      tilt={40}
      speed={0.16}
      morph={0.25}
      glow={theme === "light" ? 0.15 : 0.55}
      depthOfField={0.35}
      fog={0.45}
      opacity={theme === "light" ? 0.85 : 0.9}
      hoverEffect="trace"
      mouseRadius={1.1}
      clickEffect="pulse"
      markers="dots"
      parallax={0.35}
    />
  );
}
