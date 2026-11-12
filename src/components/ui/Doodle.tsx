import { doodleSpec, drawDoodle, type Shape } from "@/lib/doodle";

/* Draws one doodle from its seed. No hooks and no browser APIs, so it renders in server
   components, client components and the auth stage alike, and the server and browser always
   agree on the drawing. */

function ShapeEl({ s, draw, i }: { s: Shape; draw: boolean; i: number }) {
  const stroke = s.stroke
    ? { stroke: s.stroke, strokeWidth: s.sw ?? 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const }
    : {};
  // pathLength=1 lets the draw-in animation use one dash length for every stroke.
  const drawProps =
    draw && s.stroke ? { pathLength: 1, className: "doodle-draw", style: { animationDelay: `${i * 45}ms` } } : {};
  const common = { fill: s.fill ?? "none", opacity: s.opacity, ...stroke, ...drawProps };
  if (s.el === "path") return <path d={s.d} {...common} />;
  if (s.el === "circle") return <circle cx={s.cx} cy={s.cy} r={s.r} {...common} />;
  return <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...common} />;
}

export function Doodle({
  seed,
  className = "",
  title,
  draw = false,
}: {
  seed: string;
  className?: string;
  /** accessible name; omit for a decorative doodle */
  title?: string;
  /** ink the strokes in on mount (auth stage); reduced motion shows them at once */
  draw?: boolean;
}) {
  const spec = doodleSpec(seed);
  const { back, body, head } = drawDoodle(spec);
  // useId is a hook; a seed-derived id keeps this hook-free and unique enough per seed.
  const clip = `dc-${seed.replace(/[^a-z0-9]/gi, "").slice(0, 24) || "x"}`;
  let n = 0;
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <clipPath id={clip}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="64" height="64" fill={spec.tile} />
        {body.map((s) => (
          <ShapeEl key={`b${n}`} s={s} draw={draw} i={n++} />
        ))}
        <g transform={`rotate(${spec.tilt.toFixed(2)} 32 40)`}>
          {back.map((s) => (
            <ShapeEl key={`k${n}`} s={s} draw={draw} i={n++} />
          ))}
          {head.map((s) => (
            <ShapeEl key={`h${n}`} s={s} draw={draw} i={n++} />
          ))}
        </g>
      </g>
    </svg>
  );
}
