import { useRef, useState, type CSSProperties } from "react";
import { Plush } from "../../src/components/plush/Plush";
import { PlushLive, type PlushState } from "../../src/components/plush/PlushLive";
import { Doodle } from "../../src/components/ui/Doodle";
import { PLUSH_ACCESSORIES, PLUSH_SHAPES } from "../../src/lib/plush";
import { comboSeed, PLUSH_SEEDS } from "./plush-fixture";

/* Plush faces on their own, on the app's light or dark stage. Sizes are inline styles: Tailwind
   only generates classes it finds under src/.

   - "basic": two live and a row of stills in round frames, as the app frames them.
   - "sheet": 24 seeds as stills at `px` (the contact sheet).
   - "combos": every shape with every accessory, 24 stills at `px`.
   - "many": `count` live faces, to show the cap on live canvases.
   - "stage": one large live face beside a text field, for the animation frames. */

const frame = (px: number, extra: CSSProperties = {}): CSSProperties => ({ display: "block", width: px, height: px, flexShrink: 0, overflow: "hidden", borderRadius: 999, ...extra });
const row: CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20 };
const fill: CSSProperties = { display: "block", width: "100%", height: "100%" };

export function PlushHarness({
  theme = "light",
  view = "basic",
  px = 96,
  count = 6,
  state = "idle",
  seed = PLUSH_SEEDS[0],
  level,
  drowsyAfter,
  asleepAfter,
  box = 320,
}: {
  theme?: "light" | "dark";
  view?: "basic" | "sheet" | "combos" | "many" | "stage";
  px?: number;
  count?: number;
  state?: PlushState;
  seed?: string;
  level?: number;
  drowsyAfter?: number;
  asleepAfter?: number;
  box?: number;
}) {
  const field = useRef<HTMLInputElement>(null);
  const [party, setParty] = useState(0);
  return (
    <div className="mx-app bg-bg text-ink" data-theme={theme} style={{ minHeight: "100dvh", padding: 32 }}>
      <main style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <h1 className="display" style={{ fontSize: 28 }}>
          Plush faces
        </h1>
        {view === "basic" ? (
          <>
            <section aria-label="Live" style={row}>
              <span data-testid="live-frame" className="bg-surface shadow-warm-2 ring-4 ring-surface" style={frame(110)}>
                <PlushLive allowSoftware seed={PLUSH_SEEDS[0]} state={state} size={110} label="Samar's agent" className="block h-full w-full" />
              </span>
              <span style={frame(160)}>
                <PlushLive allowSoftware seed={PLUSH_SEEDS[2]} state={state} size={160} className="block h-full w-full" />
              </span>
              <p className="text-ink-2">Juniper</p>
            </section>
            <section aria-label="Still" style={row}>
              {PLUSH_SEEDS.slice(0, 4).map((s, i) => (
                <span key={s} data-testid={`still-${i}`} className="bg-surface ring-2 ring-surface" style={frame(44)}>
                  <Doodle seed={s} title={`Person ${i + 1}`} className="block h-full w-full" />
                </span>
              ))}
              <span data-testid="still-small" className="bg-bg-2" style={frame(24)}>
                <Doodle seed={PLUSH_SEEDS[1]} title="Small face" className="block h-full w-full" />
              </span>
              <span data-testid="still-plain" style={frame(44)}>
                <Doodle seed={PLUSH_SEEDS[5]} className="block h-full w-full" />
              </span>
            </section>
          </>
        ) : null}
        {view === "sheet" ? (
          <section aria-label="Sheet" data-testid="sheet" style={{ display: "grid", gridTemplateColumns: `repeat(8, ${px}px)`, gap: Math.max(8, px / 6), alignSelf: "start", padding: 4 }}>
            {PLUSH_SEEDS.map((s) => (
              <span key={s} style={{ display: "block", width: px, height: px }}>
                <Plush seed={s} size={px} className="block h-full w-full" />
              </span>
            ))}
          </section>
        ) : null}
        {view === "combos" ? (
          <section aria-label="Combos" data-testid="sheet" style={{ display: "grid", gridTemplateColumns: `repeat(6, ${px}px)`, gap: Math.max(8, px / 6), alignSelf: "start", padding: 4 }}>
            {PLUSH_ACCESSORIES.flatMap((a) =>
              PLUSH_SHAPES.map((sh) => (
                <span key={`${sh}-${a}`} data-combo={`${sh}-${a}`} style={{ display: "block", width: px, height: px }}>
                  <Plush seed={comboSeed(sh, a)} size={px} className="block h-full w-full" />
                </span>
              )),
            )}
          </section>
        ) : null}
        {view === "many" ? (
          <section aria-label="Many" style={row}>
            {PLUSH_SEEDS.slice(0, count).map((s) => (
              <span key={s} className="bg-surface" style={frame(96)}>
                <PlushLive allowSoftware seed={s} size={96} className="block h-full w-full" />
              </span>
            ))}
          </section>
        ) : null}
        {view === "stage" ? (
          <section aria-label="Stage" style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
            <span data-testid="stage" className="rounded-hero bg-surface" style={{ display: "block", width: box, height: box, overflow: "hidden" }}>
              <span style={fill}>
                <PlushLive allowSoftware seed={seed} state={state} size={box} level={level} celebrate={party} followInput={field} drowsyAfter={drowsyAfter} asleepAfter={asleepAfter} label="Your agent" className="block h-full w-full" />
              </span>
            </span>
            <label className="text-ink-2" style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: box + 40, marginTop: 24 }}>
              Name
              <input ref={field} className="rounded-ctl border border-line bg-surface text-ink" style={{ padding: "8px 12px", width: 260 }} />
            </label>
            <button type="button" className="rounded-ctl border border-line bg-surface text-ink" style={{ padding: "8px 12px" }} onClick={() => setParty((n) => n + 1)}>
              Confirm decision
            </button>
          </section>
        ) : null}
      </main>
    </div>
  );
}
