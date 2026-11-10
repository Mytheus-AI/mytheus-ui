import type { CSSProperties } from "react";
import { Avatar } from "@/components/ui/Avatar";

/* ================================================================== */
/*  The brand-panel illustrations. Each is the coral line, drawn once  */
/*  on arrival (`.auth-draw`, see src/styles/auth.css), with beads for */
/*  meetings:                                                          */
/*    sign-in    a short memory line of recent meetings, ending on a   */
/*               solid bead where you pick up                          */
/*    sign-up    the line starting fresh from one solid bead           */
/*    workspace  the line branching from you to your teammates         */
/*  All decorative: the panel's headline carries the meaning.          */
/*  The SVG and its HTML overlays share one aspect ratio, so overlay   */
/*  positions are plain percentages of the viewBox.                    */
/* ================================================================== */

export type AuthArtKind = "sign-in" | "sign-up" | "workspace";

const W = 480;
const H = 480;

const timing = (du: number, dl = 0) => ({ ["--du" as string]: `${du}s`, ["--dl" as string]: `${dl}s` }) as CSSProperties;
const delay = (dl: number) => ({ ["--dl" as string]: `${dl}s` }) as CSSProperties;

export function AuthArt({ kind, label }: { kind: AuthArtKind; label?: string }) {
  return (
    <div className="auth-art relative mx-auto aspect-square w-full max-w-[460px]" aria-hidden>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible">
        {kind === "sign-in" ? <MemoryLine /> : kind === "sign-up" ? <FirstMeeting /> : <Branches label={label} />}
      </svg>
      {kind === "workspace" ? <Teammates /> : null}
    </div>
  );
}

/* ---------------- sign-in: the week so far ---------------- */

const PAST = [
  { y: 70, title: "Roadmap sync", note: "Monday: ship date locked", dl: 0.45 },
  { y: 190, title: "Pricing review", note: "Wednesday: Pro tier set at $29", dl: 1.05 },
  { y: 310, title: "Customer call", note: "Thursday: SSO promised", dl: 1.6 },
];

function MemoryLine() {
  const x = 120;
  const bend = 78;
  const seg = (from: number, to: number) => {
    const mid = (from + to) / 2;
    return `C ${x} ${from + 30} ${bend} ${from + 30} ${bend} ${mid} C ${bend} ${to - 30} ${x} ${to - 30} ${x} ${to}`;
  };
  const d = `M ${bend} -16 C ${bend} 30 ${x} 30 ${x} 70 ${seg(70, 190)} ${seg(190, 310)} ${seg(310, 430)}`;
  return (
    <>
      <path className="art-line auth-draw" pathLength={1} style={timing(2.3, 0.1)} d={d} />
      {PAST.map((m) => (
        <g key={m.title} className="auth-appear" style={delay(m.dl)}>
          <circle className="art-bead" cx={x} cy={m.y} r={7} />
          <text className="art-title" x={x + 30} y={m.y + 1}>
            {m.title}
          </text>
          <text className="art-note" x={x + 30} y={m.y + 26}>
            {m.note}
          </text>
        </g>
      ))}
      <g className="auth-appear" style={delay(2.25)}>
        <circle className="art-bead-now" cx={x} cy={430} r={9} />
        <text className="art-strong" x={x + 30} y={429}>
          Today
        </text>
        <text className="art-note" x={x + 30} y={455}>
          the room picks up from here
        </text>
      </g>
    </>
  );
}

/* ---------------- sign-up: a fresh line ---------------- */

const NEXT = [
  { x: 220, y: 262, note: "the next one", dl: 0.9, below: true },
  { x: 330, y: 202, note: "the one after", dl: 1.35, below: true },
  { x: 430, y: 122, note: "and every one after", dl: 1.8, below: false },
];

function FirstMeeting() {
  const d = "M 86 342 C 140 342 166 262 220 262 C 274 262 286 202 330 202 C 376 202 390 122 430 122";
  return (
    <>
      <path className="art-line auth-draw" pathLength={1} style={timing(1.9, 0.5)} d={d} />
      {NEXT.map((b) => (
        <g key={b.note} className="auth-appear" style={delay(b.dl)}>
          <circle className="art-bead-ghost" cx={b.x} cy={b.y} r={6.5} />
          <text className="art-note" x={b.below ? b.x : b.x + 16} y={b.below ? b.y + 34 : b.y - 22} textAnchor={b.below ? "middle" : "end"}>
            {b.note}
          </text>
        </g>
      ))}
      <g className="auth-appear" style={delay(0.1)}>
        <circle className="art-bead-now" cx={86} cy={342} r={11} />
        <text className="art-title" x={62} y={392}>
          Your first meeting
        </text>
        <text className="art-note" x={62} y={418}>
          where the line starts
        </text>
      </g>
    </>
  );
}

/* ---------------- workspace: the line branching to teammates ---------------- */

const TEAM = [
  { name: "Maya", y: 110 },
  { name: "Raj", y: 240 },
  { name: "Priya", y: 370 },
];
const FORK = { x: 210, y: 240 };
const SEAT_X = 400;

function Branches({ label }: { label?: string }) {
  const shown = clip(label?.trim() || "your team", 22);
  return (
    <>
      <path className="art-line auth-draw" pathLength={1} style={timing(0.7, 0.3)} d={`M 70 ${FORK.y} L ${FORK.x} ${FORK.y}`} />
      {TEAM.map((t, i) => (
        <path
          key={t.name}
          className="art-line auth-draw"
          pathLength={1}
          style={timing(0.9, 0.95 + i * 0.12)}
          d={`M ${FORK.x} ${FORK.y} C ${FORK.x + 80} ${FORK.y} ${SEAT_X - 110} ${t.y} ${SEAT_X} ${t.y}`}
        />
      ))}
      <g className="auth-appear" style={delay(0.1)}>
        <circle className="art-bead-now" cx={70} cy={FORK.y} r={11} />
        <text className="art-strong" x={70} y={FORK.y + 44} textAnchor="middle">
          You
        </text>
      </g>
      <g className="auth-appear" style={delay(0.9)}>
        <circle className="art-bead" cx={FORK.x} cy={FORK.y} r={7} />
        <text className="art-title" x={FORK.x} y={FORK.y - 26} textAnchor="middle">
          {shown}
        </text>
      </g>
      {TEAM.map((t, i) => (
        <text key={t.name} className="art-note auth-appear" style={delay(1.7 + i * 0.12)} x={SEAT_X} y={t.y + 50} textAnchor="middle">
          {t.name}
        </text>
      ))}
    </>
  );
}

function Teammates() {
  return (
    <>
      {TEAM.map((t, i) => (
        <span
          key={t.name}
          className="auth-appear absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${(SEAT_X / W) * 100}%`, top: `${(t.y / H) * 100}%`, ...delay(1.6 + i * 0.12) }}
        >
          <Avatar name={t.name} size="lg" className="shadow-warm-2 ring-[3px] ring-surface" />
        </span>
      ))}
    </>
  );
}

/* ---------------- the slim band below lg ---------------- */

/** The same idea in one short horizontal stroke, for the band above the form on small screens. */
export function AuthBandLine({ kind }: { kind: AuthArtKind }) {
  return (
    <svg viewBox="0 0 300 36" className="auth-art block h-auto w-full max-w-[300px] overflow-visible" aria-hidden>
      {kind === "sign-in" ? (
        <>
          <path className="art-line auth-draw" pathLength={1} style={timing(1.2, 0.1)} d="M 0 20 C 24 20 32 13 56 13 C 88 13 100 25 132 25 C 164 25 176 13 208 13 C 240 13 254 20 280 20" />
          {[
            [56, 13],
            [132, 25],
            [208, 13],
          ].map(([cx, cy], i) => (
            <circle key={cx} className="art-bead auth-appear" style={delay(0.3 + i * 0.25)} cx={cx} cy={cy} r={5} />
          ))}
          <circle className="art-bead-now auth-appear" style={delay(1.15)} cx={280} cy={20} r={6.5} />
        </>
      ) : kind === "sign-up" ? (
        <>
          <path className="art-line auth-draw" pathLength={1} style={timing(1.1, 0.3)} d="M 16 26 C 44 26 56 15 88 15 C 120 15 132 24 164 24 C 196 24 210 12 244 12" />
          {[
            [88, 15],
            [164, 24],
            [244, 12],
          ].map(([cx, cy], i) => (
            <circle key={cx} className="art-bead-ghost auth-appear" style={delay(0.6 + i * 0.25)} cx={cx} cy={cy} r={4.5} />
          ))}
          <circle className="art-bead-now auth-appear" style={delay(0.1)} cx={16} cy={26} r={7} />
        </>
      ) : (
        <>
          <path className="art-line auth-draw" pathLength={1} style={timing(0.5, 0.2)} d="M 16 18 L 130 18" />
          {[6, 18, 30].map((y, i) => (
            <path key={y} className="art-line auth-draw" pathLength={1} style={timing(0.6, 0.65 + i * 0.1)} d={`M 130 18 C 180 18 200 ${y} 250 ${y}`} />
          ))}
          <circle className="art-bead-now auth-appear" style={delay(0.1)} cx={16} cy={18} r={7} />
          <circle className="art-bead auth-appear" style={delay(0.6)} cx={130} cy={18} r={5} />
          {[6, 18, 30].map((y, i) => (
            <circle key={y} className="art-bead-ghost auth-appear" style={delay(1.1 + i * 0.1)} cx={250} cy={y} r={4.5} />
          ))}
        </>
      )}
    </svg>
  );
}

function clip(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}
