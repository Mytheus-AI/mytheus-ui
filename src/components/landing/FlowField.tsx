"use client";

import { useReducedMotion } from "framer-motion";

/* ================================================================== */
/*  FlowField — a ribbon of flowing parallel lines with a glowing clay  */
/*  orb that sweeps along the lead curve, leading a comet "tube" of      */
/*  fading rings behind it. A native, on-brand recreation of the         */
/*  Lottie "signal-on-a-wave" motif (warm clay on cream; no Lottie       */
/*  runtime, no deps). Decorative: pointer-events-none + aria-hidden.     */
/*  Reduced motion → a static frame (orb parked, no sweep, no comet).     */
/* ================================================================== */

// the lead contour (centred on the origin), lifted verbatim from the source art
const FLOW_PATH =
  "M802.25,-193.75 C546.75,-178.25 574.534,-29.831 461.25,9.75 C378.25,38.75 281.75,-40.75 180.75,-40.75 C45.138,-40.75 -34.243,24.044 -103.25,49.25 C-270.25,110.25 -441.25,60.25 -510.75,60.25 C-681.25,60.25 -732.75,122.25 -802.25,193.75";

const LINES = 9; // parallel ribbon lines (lead + 8 echoes)
const STEP = 16; // vertical gap between ribbon lines
const RINGS = 10; // rings in the comet tail
const DUR = 6; // seconds for one full sweep across the curve
const STAGGER = 0.06; // delay between comet rings (s) — tighter = denser tube
const START = { x: 802.25, y: -193.75 }; // path origin = getPointAtLength(0)

export function FlowField({ className = "" }: { className?: string }) {
  const reduce = !!useReducedMotion();

  return (
    <div className={`pointer-events-none text-signal ${className}`} aria-hidden>
      <svg
        viewBox="-820 -210 1640 570"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        {/* the ribbon: parallel flowing lines, each fainter than the last.
            it breathes with a slow vertical drift. */}
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
              id={i === 0 ? "flow-lead" : undefined}
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

        {/* comet tail: equal-size rings strung along the curve just behind the
            orb, forming a glowing tube; each lags a little more and fades. */}
        {!reduce &&
          Array.from({ length: RINGS }).map((_, i) => (
            <circle
              key={i}
              r="28"
              cx="0"
              cy="0"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeOpacity={0.5 * (1 - i / RINGS)}
            >
              <animateMotion
                dur={`${DUR}s`}
                repeatCount="indefinite"
                calcMode="linear"
                begin={`-${(RINGS - 1 - i) * STAGGER}s`}
              >
                <mpath xlinkHref="#flow-lead" />
              </animateMotion>
            </circle>
          ))}

        {/* the orb — the bright head leading the comet */}
        <circle
          r="12"
          className="fill-signal"
          cx={reduce ? START.x : 0}
          cy={reduce ? START.y : 0}
          style={{ filter: "drop-shadow(0 0 11px var(--signal-glow))" }}
        >
          {!reduce && (
            <animateMotion
              dur={`${DUR}s`}
              repeatCount="indefinite"
              calcMode="linear"
              begin={`-${RINGS * STAGGER}s`}
            >
              <mpath xlinkHref="#flow-lead" />
            </animateMotion>
          )}
        </circle>
      </svg>
    </div>
  );
}
