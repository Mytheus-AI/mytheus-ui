import type { CSSProperties } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Doodle } from "@/components/ui/Doodle";
import { defaultDoodleSeed } from "@/lib/doodle";

/* ================================================================== */
/*  The brand-panel illustrations. Each is the coral line, drawn once  */
/*  on arrival (`.auth-draw`, see src/styles/auth.css), with beads for */
/*  meetings:                                                          */
/*    sign-in    the week's meetings as cards on the line (doodle      */
/*               faces of who was there, what was kept), ending on     */
/*               today's card and a solid bead                         */
/*    sign-up    the line starting at your first meeting's card and    */
/*               running down through faint cards still to come        */
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
      {kind === "workspace" ? <Teammates /> : kind === "sign-in" ? <WeekCards /> : <FirstCards />}
    </div>
  );
}

/* ---------------- sign-in: the week so far ---------------- */

/* Three meetings from the week as small cards on the thread: who was in the room (their doodle
   faces) and the one thing the agent kept. The thread ends on today's card, the one you are
   signing in to. Cards are HTML over the SVG thread, placed in viewBox units like Teammates. */

type Met = { y: number; title: string; day: string; kept: string; people: string[]; dl: number };

const WEEK: Met[] = [
  { y: 62, title: "Roadmap sync", day: "Monday", kept: "Ship date locked", people: ["Maya", "Raj", "Priya"], dl: 0.45 },
  { y: 178, title: "Pricing review", day: "Wednesday", kept: "Pro tier at $29", people: ["Sarah", "Diego"], dl: 1.0 },
  { y: 294, title: "Customer call", day: "Thursday", kept: "SSO promised", people: ["Aiko", "Daniel", "Maya"], dl: 1.5 },
];
const TODAY = { y: 412, dl: 2.15 };
const RAIL_X = 34;
const CARD_X = 68;

/** The thread down the rail: through every bead at RAIL_X, swinging out to the left between
    them. `leadIn` brings it in from above the art (sign-in); without it the line starts at the
    first bead (sign-up). */
function railPath(ys: number[], leadIn: boolean) {
  const x = RAIL_X;
  const bend = 12;
  const seg = (from: number, to: number) => {
    const mid = (from + to) / 2;
    return `C ${x} ${from + 28} ${bend} ${from + 28} ${bend} ${mid} C ${bend} ${to - 28} ${x} ${to - 28} ${x} ${to}`;
  };
  let d = leadIn ? `M ${bend} -16 C ${bend} 24 ${x} 24 ${x} ${ys[0]}` : `M ${x} ${ys[0]}`;
  for (let i = 1; i < ys.length; i++) d += ` ${seg(ys[i - 1], ys[i])}`;
  return d;
}

const place = (y: number) => ({ left: `${(CARD_X / W) * 100}%`, top: `${(y / H) * 100}%` });

function MemoryLine() {
  const x = RAIL_X;
  const d = railPath([...WEEK.map((m) => m.y), TODAY.y], true);
  return (
    <>
      <path className="art-line auth-draw" pathLength={1} style={timing(2.3, 0.1)} d={d} />
      {WEEK.map((m) => (
        <circle key={m.title} className="art-bead auth-appear" style={delay(m.dl)} cx={x} cy={m.y} r={7} />
      ))}
      <circle className="art-bead-now auth-appear" style={delay(TODAY.dl)} cx={x} cy={TODAY.y} r={9} />
    </>
  );
}

/** Overlapping doodle faces, then `seats` empty dashed chairs for people not there yet. */
function Faces({ people, size = 34, seats = 0 }: { people: string[]; size?: number; seats?: number }) {
  const overlap = -size / 3.2;
  return (
    <span className="flex">
      {people.map((p, i) => (
        <span
          key={p}
          className="block overflow-hidden rounded-full bg-surface shadow-warm-1 ring-2 ring-surface"
          style={{ width: size, height: size, marginLeft: i ? overlap : 0, zIndex: people.length - i + seats }}
        >
          <Doodle seed={defaultDoodleSeed(p)} className="block h-full w-full" />
        </span>
      ))}
      {Array.from({ length: seats }, (_, i) => (
        <span
          key={`seat-${i}`}
          className="block rounded-full border-2 border-dashed border-line-2 bg-surface-2 ring-2 ring-surface"
          style={{ width: size, height: size, marginLeft: people.length || i ? overlap : 0, zIndex: seats - i }}
        />
      ))}
    </span>
  );
}

function WeekCards() {
  return (
    <>
      {WEEK.map((m) => (
        <div
          key={m.title}
          className="auth-appear absolute right-0 -translate-y-1/2 rounded-card bg-surface px-4 py-3 shadow-warm-1 ring-1 ring-line"
          style={{ ...place(m.y), ...delay(m.dl) }}
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display text-[17px] font-medium leading-tight tracking-[-0.01em] text-ink">{m.title}</p>
            <span className="text-[13px] text-ink-3">{m.day}</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="truncate rounded-full bg-signal-soft px-2.5 py-0.5 text-[13px] font-medium text-signal-ink">
              {m.kept}
            </span>
            <Faces people={m.people} />
          </div>
        </div>
      ))}
      <div
        className="auth-appear absolute right-0 -translate-y-1/2 rounded-card bg-surface px-4 pb-3.5 pt-3 shadow-warm-2 ring-1 ring-signal-line"
        style={{ ...place(TODAY.y), ...delay(TODAY.dl) }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-display text-[20px] font-medium leading-tight tracking-[-0.01em] text-ink">Launch review</p>
          <span className="text-[13px] font-semibold text-signal-ink">Today, 10:30</span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="font-display text-[15px] italic text-ink-3">picks up with 3 open questions</span>
          <Faces people={["Maya", "Raj", "Sarah", "Diego"]} size={36} />
        </div>
      </div>
    </>
  );
}

/* ---------------- sign-up: a fresh line ---------------- */

/* The mirror of sign-in. The line starts at a solid bead on your first meeting's card (you, and
   empty seats for the team you will invite), then runs down through dashed cards for the
   meetings still to come, each fainter than the last. */

const FIRST = { y: 66, dl: 0.1 };
const AHEAD = [
  { y: 196, title: "The next one", note: "kept for you", seats: 3, fade: 0.9, dl: 0.85 },
  { y: 306, title: "The one after", note: "remembered too", seats: 3, fade: 0.65, dl: 1.3 },
  { y: 416, title: "And every one after", note: "never lost", seats: 2, fade: 0.4, dl: 1.75 },
];

function FirstMeeting() {
  const x = RAIL_X;
  const d = railPath([FIRST.y, ...AHEAD.map((a) => a.y)], false);
  return (
    <>
      <path className="art-line auth-draw" pathLength={1} style={timing(1.9, 0.5)} d={d} />
      {AHEAD.map((a) => (
        <circle key={a.title} className="art-bead-ghost auth-appear" style={delay(a.dl)} cx={x} cy={a.y} r={6.5} />
      ))}
      <circle className="art-bead-now auth-appear" style={delay(FIRST.dl)} cx={x} cy={FIRST.y} r={10} />
    </>
  );
}

function FirstCards() {
  return (
    <>
      <div
        className="auth-appear absolute right-0 -translate-y-1/2 rounded-card bg-surface px-4 pb-3.5 pt-3 shadow-warm-2 ring-1 ring-signal-line"
        style={{ ...place(FIRST.y), ...delay(FIRST.dl) }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] font-semibold text-signal-ink">Your first meeting</span>
          <span className="text-[13px] text-ink-3">Today</span>
        </div>
        <p className="mt-0.5 font-display text-[20px] font-medium leading-tight tracking-[-0.01em] text-ink">Kickoff</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="font-display text-[15px] italic text-ink-3">where the line starts</span>
          <Faces people={["You"]} size={36} seats={2} />
        </div>
      </div>
      {AHEAD.map((a) => (
        <div key={a.title} className="auth-appear absolute right-0 -translate-y-1/2" style={{ ...place(a.y), ...delay(a.dl) }}>
          <div
            className="rounded-card border-[1.5px] border-dashed border-line-2 bg-surface-2 px-4 py-2.5"
            style={{ opacity: a.fade }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-display text-[17px] font-medium leading-tight tracking-[-0.01em] text-ink-2">{a.title}</p>
              <span className="text-[13px] text-ink-3">Soon</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="font-display text-[15px] italic text-ink-3">{a.note}</span>
              <Faces people={[]} seats={a.seats} size={28} />
            </div>
          </div>
        </div>
      ))}
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
