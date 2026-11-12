import type { CSSProperties } from "react";
import { AgentOrb } from "../../src/components/agent/AgentOrb";

/* Agent orbs on their own: two live and a row of stills in round frames, as the app frames them,
   on the app's light or dark stage. `gallery` lays out many seeds for a visual check. Sizes are
   inline styles: Tailwind only generates classes it finds under src/. */

export const ORB_SEEDS = ["ic5kget9wh", "abcd2345", "agent-seed-juniper", "k3mzq7wpta", "p9xh2vbnce", "tq4rws8kdm", "m2nb7yczfh", "w8ehq3jxua", "zr6t5pdkmv", "h4sgf9n2qb", "c7vyx3rmte", "u5kd8wqa2z"];

const frame = (px: number, extra: CSSProperties = {}): CSSProperties => ({
  display: "block",
  width: px,
  height: px,
  flexShrink: 0,
  overflow: "hidden",
  borderRadius: 999,
  ...extra,
});
const row: CSSProperties = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20 };

export function OrbHarness({
  theme = "light",
  gallery = false,
  liveState = "idle",
}: {
  theme?: "light" | "dark";
  gallery?: boolean;
  liveState?: "idle" | "listening" | "speaking";
}) {
  return (
    <div className="mx-app bg-bg text-ink" data-theme={theme} style={{ minHeight: "100dvh", padding: 32 }}>
      <main style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <h1 className="display" style={{ fontSize: 28 }}>
          Agent orbs
        </h1>
        <section aria-label="Live" style={row}>
          <span data-testid="live-frame" className="bg-surface shadow-warm-2 ring-4 ring-surface" style={frame(110)}>
            <AgentOrb seed={ORB_SEEDS[0]} mode="live" state={liveState} size={110} label="Samar's agent" />
          </span>
          <span style={frame(160)}>
            <AgentOrb seed={ORB_SEEDS[2]} mode="live" state={liveState} size={160} />
          </span>
          <p className="text-ink-2">Juniper</p>
        </section>
        <section aria-label="Still" style={row}>
          {(gallery ? ORB_SEEDS : ORB_SEEDS.slice(0, 4)).map((s, i) => (
            <span key={s} data-testid={`still-${i}`} className="bg-surface ring-2 ring-surface" style={frame(44)}>
              <AgentOrb seed={s} size={44} label={`Agent ${i + 1}`} />
            </span>
          ))}
          <span data-testid="still-small" className="bg-bg-2" style={frame(24)}>
            <AgentOrb seed={ORB_SEEDS[1]} size={24} label="Small agent" />
          </span>
        </section>
        {gallery ? (
          <section aria-label="Gallery" style={row}>
            {ORB_SEEDS.map((s) => (
              <span key={s} className="bg-surface" style={frame(120)}>
                <AgentOrb seed={s} size={120} />
              </span>
            ))}
          </section>
        ) : null}
      </main>
    </div>
  );
}
