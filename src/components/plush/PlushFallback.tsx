import { plushHex, PLUSH_INK, type PlushSpec } from "@/lib/plush";

/* What a plush is before and without WebGL. No hooks and no browser APIs, so the server renders
   them too, at exactly the box the picture will fill: nothing moves when it arrives.

   - PlushPlaceholder: a soft circle in the character's colour, shown until its still is ready.
   - PlushFallback: the same circle with two simple eyes, for a browser with no WebGL2 or a
     context that was lost and could not be rebuilt.

   Colours come from the palette in lib/plush.ts, never from here. */

export function PlushPlaceholder({ spec, hidden = false }: { spec: PlushSpec; hidden?: boolean }) {
  return (
    <span
      aria-hidden
      className="plush-soft"
      data-hidden={hidden ? "" : undefined}
      style={{ background: `radial-gradient(circle at 42% 36%, ${plushHex(spec.colour, 0.38)} 0%, ${plushHex(spec.colour, 0.08)} 72%, ${plushHex(spec.colour, -0.08)} 100%)` }}
    />
  );
}

export function PlushFallback({ spec }: { spec: PlushSpec }) {
  const happy = spec.eyes === "happy";
  return (
    <svg viewBox="0 0 64 64" aria-hidden focusable="false">
      <circle cx="32" cy="32" r="27.5" fill={plushHex(spec.colour)} />
      <ellipse cx="24" cy="20" rx="12" ry="8" fill={plushHex(spec.colour, 0.45)} opacity="0.5" />
      {happy ? (
        <g fill="none" stroke={PLUSH_INK} strokeWidth="2.6" strokeLinecap="round">
          <path d="M20.5 35.5a4 4 0 0 1 8 0" />
          <path d="M35.5 35.5a4 4 0 0 1 8 0" />
        </g>
      ) : (
        <g>
          <circle cx="24.5" cy="34" r="3.7" fill={PLUSH_INK} />
          <circle cx="39.5" cy="34" r="3.7" fill={PLUSH_INK} />
          <circle cx="23.3" cy="32.7" r="1.15" fill={plushHex(spec.colour, 0.92)} />
          <circle cx="38.3" cy="32.7" r="1.15" fill={plushHex(spec.colour, 0.92)} />
        </g>
      )}
      <ellipse cx="17.5" cy="40" rx="3.6" ry="2.2" fill={plushHex(spec.colour, 0.5)} opacity="0.55" />
      <ellipse cx="46.5" cy="40" rx="3.6" ry="2.2" fill={plushHex(spec.colour, 0.5)} opacity="0.55" />
    </svg>
  );
}
