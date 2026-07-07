"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

/* ================================================================== */
/*  FlowField — a ribbon of flowing parallel lines (always fully laid   */
/*  down) with a glowing clay orb that rides the lead curve UNDER       */
/*  SCROLL: as the closing CTA travels the viewport top→bottom, the     */
/*  orb sweeps the curve and its concentric comet rings follow together */
/*  as one tube, each a breath behind. Scrolling back runs the sweep    */
/*  in reverse. Decorative: pointer-events-none + aria-hidden.           */
/*  Reduced motion → static ribbon, orb parked, no rings.               */
/* ================================================================== */

// the lead contour (centred on the origin), lifted verbatim from the source art
const FLOW_PATH =
  "M802.25,-193.75 C546.75,-178.25 574.534,-29.831 461.25,9.75 C378.25,38.75 281.75,-40.75 180.75,-40.75 C45.138,-40.75 -34.243,24.044 -103.25,49.25 C-270.25,110.25 -441.25,60.25 -510.75,60.25 C-681.25,60.25 -732.75,122.25 -802.25,193.75";

const LINES = 9; // parallel ribbon lines (lead + 8 echoes)
const STEP = 16; // vertical gap between ribbon lines
const RINGS = 10; // concentric rings in the comet tube
const LAG = 0.014; // progress gap between successive rings
const START = { x: 802.25, y: -193.75 }; // path origin = getPointAtLength(0)

/* one element pinned to the curve at (scroll progress − lag) */
function FlowRider({
  p,
  lag,
  leadRef,
  children,
}: {
  p: MotionValue<number>;
  lag: number;
  leadRef: React.RefObject<SVGPathElement>;
  children: React.ReactNode;
}) {
  const at = (v: number) => {
    const el = leadRef.current;
    if (!el) return START;
    const t = Math.max(0, Math.min(1, v - lag));
    return el.getPointAtLength(t * el.getTotalLength());
  };
  const x = useTransform(p, (v) => at(v).x);
  const y = useTransform(p, (v) => at(v).y);
  return <motion.g style={{ x, y }}>{children}</motion.g>;
}

export function FlowField({ className = "" }: { className?: string }) {
  const reduce = !!useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const leadRef = useRef<SVGPathElement>(null);

  /* the orb's position on the curve IS the section's travel through the
     viewport: enters at the top → orb at the start; leaves at the bottom
     → orb has crossed the whole curve */
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.4 });

  return (
    <div
      ref={ref}
      className={`pointer-events-none text-signal ${className}`}
      aria-hidden
    >
      <svg
        viewBox="-820 -210 1640 570"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        {/* the ribbon: parallel flowing lines, fully laid down, breathing
            with a slow vertical drift */}
        <g>
          {!reduce && (
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0 0; 0 -7; 0 0"
              dur="11s"
              repeatCount="indefinite"
              calcMode="spline"
              keyTimes="0;0.5;1"
              keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
            />
          )}
          {Array.from({ length: LINES }).map((_, i) => (
            <path
              key={i}
              ref={i === 0 ? leadRef : undefined}
              d={FLOW_PATH}
              transform={`translate(0 ${i * STEP})`}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.3}
              strokeOpacity={0.5 * (1 - i / LINES)}
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* comet tube: concentric rings strung behind the orb, following
            together — every ring's position derives from the same scroll
            value, each a breath further back along the curve */}
        {!reduce &&
          Array.from({ length: RINGS }).map((_, i) => (
            <FlowRider key={i} p={p} lag={(RINGS - i) * LAG} leadRef={leadRef}>
              <circle
                r={28}
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
                strokeOpacity={0.5 * ((i + 1) / RINGS)}
              />
            </FlowRider>
          ))}

        {/* the orb — the bright head leading the tube */}
        {reduce ? (
          <circle
            r={12}
            cx={START.x}
            cy={START.y}
            className="fill-signal"
            style={{ filter: "drop-shadow(0 0 11px var(--signal-glow))" }}
          />
        ) : (
          <FlowRider p={p} lag={0} leadRef={leadRef}>
            <circle
              r={12}
              className="fill-signal"
              style={{ filter: "drop-shadow(0 0 11px var(--signal-glow))" }}
            />
          </FlowRider>
        )}
      </svg>
    </div>
  );
}
