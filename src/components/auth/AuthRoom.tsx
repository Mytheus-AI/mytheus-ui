"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { Plus } from "@phosphor-icons/react";
import { LogoMark } from "@/components/Logo";
import { Chip } from "@/components/site/Section";
import { Doodle } from "@/components/ui/Doodle";
import { blob, defaultDoodleSeed, seededRandom, wobble } from "@/lib/doodle";

/* ================================================================== */
/*  The brand panel on every auth page: a meeting, live, with doodles. */
/*                                                                     */
/*  A product window, the way the marketing site shows the room:       */
/*    bar    the meeting's name and when it is                        */
/*    room   doodle people round a table (its top is the coral line,   */
/*           drawn once on arrival), a whiteboard on the wall; they    */
/*           take turns talking in white bubbles                       */
/*    strip  what the agent kept: each decision, action or question    */
/*           lands on the coral thread as it is said                   */
/*  People talk, the agent remembers: the product in one glance.       */
/*                                                                     */
/*  `you` seats the visitor (their doodle on sign-up and onboarding, a */
/*  dashed open seat until they have one); `label` writes the          */
/*  workspace name on the table while it is typed. Decorative only:    */
/*  the panel's headline carries the meaning.                          */
/* ================================================================== */

export type Keep = { tag: "Decision" | "Action" | "Question" | "Done"; text: string };
/** `who` is the seat that says it: 0 Maya, 1 Raj, 2 Priya (back row), 3 Sarah, 4 Diego (front). */
export type Line = { who: number; text: string; keep?: Keep };

export type SceneProps = {
  /** the meeting's name in the window bar */
  title?: string;
  /** when it is, beside the name */
  when?: string;
  /** what the people at the table say, in turn; give three of them a `keep` */
  lines?: Line[];
  /** a doodle seed seats the visitor; "empty" shows the open seat */
  you?: string | "empty";
  /** written on the table top (the workspace being named) */
  label?: string;
};

export const DEFAULT_SCENE: Required<Pick<SceneProps, "title" | "when" | "lines">> = {
  title: "Pricing sync",
  when: "Tuesday, 10:30",
  lines: [
    { who: 0, text: "Where did we land on pricing?" },
    { who: 4, text: "Annual plans, 20% off. Agreed?", keep: { tag: "Decision", text: "Annual plans at 20% off" } },
    { who: 1, text: "Agreed. I'll update the deck.", keep: { tag: "Action", text: "Raj updates the deck" } },
    { who: 3, text: "Who signs off on the copy?", keep: { tag: "Question", text: "Who signs off the copy?" } },
    { who: 2, text: "Me, before Friday's board prep." },
  ],
};

/* The sample people (docs/DESIGN-ONELINE.md), with the same faces `Avatar` draws for them. */
const NAMES = ["Maya", "Raj", "Priya", "Sarah", "Diego"];
const PEOPLE = NAMES.map((name) => defaultDoodleSeed(name));

/* The room is 520 wide; 420 tall with the visitor's seat at the front, 372 without it (no empty
   floor). Seats are placed in its pixels and turned into % for layout. */
const RW = 520;
const RH_YOU = 420;
const RH = 372;
type SeatPos = { x: number; y: number; back: boolean; d: number };
const SEATS: SeatPos[] = [
  { x: 114, y: 150, back: true, d: 84 },
  { x: 260, y: 128, back: true, d: 84 },
  { x: 406, y: 150, back: true, d: 84 },
  { x: 68, y: 292, back: false, d: 94 },
  { x: 452, y: 292, back: false, d: 94 },
];
const YOU_SEAT: SeatPos = { x: 260, y: 352, back: false, d: 98 };

const TURN_MS = 2900;
const TONE = { Decision: "accent", Action: "low", Question: "medium", Done: "ok" } as const;

const pctX = (x: number) => `${(x / RW) * 100}%`;
const pctY = (y: number, rh: number) => `${(y / rh) * 100}%`;
const delay = (dl: number) => ({ ["--dl" as string]: `${dl}s` }) as CSSProperties;
const timing = (du: number, dl: number) => ({ ["--du" as string]: `${du}s`, ["--dl" as string]: `${dl}s` }) as CSSProperties;

/* ---------------- the room's drawing ---------------- */

/** The wall: a whiteboard behind the back row, and the shadow the table throws on the floor. */
function Wall({ rh }: { rh: number }) {
  return (
    <svg viewBox={`0 0 ${RW} ${rh}`} className="absolute inset-0 h-full w-full" aria-hidden>
      <g className="auth-appear" style={delay(0.05)}>
        <rect x="140" y="16" width="240" height="92" rx="12" fill="var(--surface)" stroke="var(--line-2)" strokeWidth={2} />
        {/* a small bar chart and a few written lines */}
        <rect x="160" y="62" width="16" height="28" rx="3" fill="var(--tint-sky)" />
        <rect x="182" y="48" width="16" height="42" rx="3" fill="var(--tint-sage)" />
        <rect x="204" y="38" width="16" height="52" rx="3" fill="var(--tint-peach)" />
        <path d="M158 92 L224 92" stroke="var(--line-2)" strokeWidth={1.6} strokeLinecap="round" />
        <path d="M300 38 L360 38 M300 52 L346 52 M300 66 L354 66" stroke="var(--line-2)" strokeWidth={2.2} strokeLinecap="round" />
        <path d="M200 116 L320 116" stroke="var(--line-2)" strokeWidth={3} strokeLinecap="round" />
      </g>
      <ellipse cx="260" cy="282" rx="206" ry="78" fill="var(--signal-deep)" opacity={0.08} />
    </svg>
  );
}

function Table({ label, rh }: { label?: string; rh: number }) {
  // Seeded, so the table is drawn identically on the server and in the browser.
  const r = seededRandom("auth-table");
  const top = blob(r, 260, 236, 180, 72, 12, 0.025);
  const slab = blob(r, 260, 252, 178, 70, 12, 0.025);
  const cup1 = blob(r, 170, 216, 13, 8, 7, 0.06);
  const cup2 = blob(r, 360, 252, 13, 8, 7, 0.06);
  const pad = wobble(r, [[296, 198], [346, 190], [354, 224], [302, 232], [296, 198]], 0.6);
  const shown = label ? (label.length > 24 ? `${label.slice(0, 23).trimEnd()}…` : label) : "";
  return (
    <svg viewBox={`0 0 ${RW} ${rh}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
      {/* the table's thickness, then its top: the one coral line in the room */}
      <path d={slab} fill="var(--surface-2)" stroke="var(--line-2)" strokeWidth={2} />
      <path
        d={top}
        fill="var(--surface)"
        stroke="var(--signal-line)"
        strokeWidth={2.6}
        strokeLinejoin="round"
        pathLength={1}
        className="auth-draw"
        style={timing(1.3, 0.15)}
      />
      <g className="auth-appear" style={delay(0.7)}>
        <path d={cup1} fill="var(--tint-peach)" stroke="var(--line-2)" strokeWidth={1.8} />
        <path d={cup2} fill="var(--tint-sky)" stroke="var(--line-2)" strokeWidth={1.8} />
        <path d={pad} fill="var(--tint-ochre)" stroke="var(--line-2)" strokeWidth={1.8} strokeLinejoin="round" />
        <path d="M306 206 L336 202 M307 214 L330 211" stroke="var(--ink-4)" strokeWidth={1.4} strokeLinecap="round" opacity={0.6} />
      </g>
      {shown ? (
        <text
          x="250"
          y="262"
          textAnchor="middle"
          fill="var(--ink-2)"
          fontSize="27"
          fontStyle="italic"
          fontWeight={500}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {shown}
        </text>
      ) : null}
    </svg>
  );
}

/* ---------------- people ---------------- */

function seatBox(seat: SeatPos, rh: number): CSSProperties {
  return { left: pctX(seat.x), top: pctY(seat.y, rh), width: pctX(seat.d), transform: "translate(-50%, -50%)" };
}

function Seat({ seed, seat, rh, talking, you, dl }: { seed: string; seat: SeatPos; rh: number; talking?: boolean; you?: boolean; dl: number }) {
  const ring = you ? "ring-signal" : talking ? "ring-signal-line" : "ring-surface";
  return (
    <div className={`absolute ${seat.back ? "z-0" : "z-20"}`} style={seatBox(seat, rh)}>
      <span className="auth-appear block" style={delay(dl)}>
        <span
          className={`room-face block aspect-square overflow-hidden rounded-full bg-surface shadow-warm-2 ring-[3px] ${ring} ${
            talking ? "is-talking" : ""
          }`}
        >
          <Doodle key={seed} seed={seed} className={`block h-full w-full ${you ? "doodle-pop" : ""}`} />
        </span>
      </span>
    </div>
  );
}

function OpenSeat({ dl }: { dl: number }) {
  const rh = RH_YOU;
  return (
    <div className="absolute z-20" style={seatBox(YOU_SEAT, rh)}>
      <span
        className="auth-appear grid aspect-square place-items-center rounded-full border-2 border-dashed border-line-2 bg-surface-2 text-ink-3"
        style={delay(dl)}
      >
        <Plus weight="bold" className="h-[34%] w-[34%]" aria-hidden />
      </span>
    </div>
  );
}

/* ---------------- speech ---------------- */

function Bubble({ line, first, rh }: { line: Line; first: boolean; rh: number }) {
  const seat = SEATS[line.who] ?? SEATS[0];
  const side = seat.x < RW / 2 ? "left" : seat.x > RW / 2 ? "right" : "middle";
  const decision = line.keep?.tag === "Decision";
  return (
    <div
      className="room-bubble pointer-events-none absolute z-30"
      style={{
        left: pctX(seat.x),
        top: pctY(seat.y - seat.d / 2 - 6, rh),
        transform: `translate(${side === "left" ? "-16%" : side === "right" ? "-84%" : "-50%"}, -100%)`,
        ...delay(first ? 1.1 : 0),
      }}
    >
      <div
        className={`relative w-max max-w-[46cqw] rounded-card px-[2.8cqw] pb-[1.7cqw] pt-[1.4cqw] text-[clamp(13px,2.9cqw,15.5px)] leading-snug shadow-warm-2 ring-1 ${
          decision ? "bg-signal-soft text-signal-ink ring-signal-line" : "bg-surface text-ink-2 ring-line"
        }`}
      >
        <span className={`block text-[clamp(12.5px,2.5cqw,13px)] font-semibold ${decision ? "text-signal-ink" : "text-ink"}`}>
          {NAMES[line.who]}
        </span>
        {line.text}
        <span
          aria-hidden
          className={`absolute -bottom-[6px] h-3 w-3 rotate-45 border-b border-r ${
            decision ? "border-signal-line bg-signal-soft" : "border-line bg-surface"
          }`}
          style={side === "left" ? { left: "16%" } : side === "right" ? { right: "16%" } : { left: "calc(50% - 6px)" }}
        />
      </div>
    </div>
  );
}

/* ---------------- the window ---------------- */

/** What the agent kept so far: each item lands on the coral thread as it is said. */
function KeptStrip({ keeps, shown }: { keeps: Keep[]; shown: number }) {
  const cols = Math.max(keeps.length, 1);
  const reach = Math.max(shown - 1, 0) / cols;
  return (
    <div className="mt-3 px-1">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-2">
          <LogoMark size={16} />
          Your agent kept
        </span>
        <span className="text-[13px] tabular-nums text-ink-3">
          {shown} of {keeps.length}
        </span>
      </div>
      <div className="relative mt-3 grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {/* the thread runs from the first bead to the latest kept one */}
        <span
          aria-hidden
          className="absolute left-[6px] top-[5px] h-[2px] rounded-full bg-signal-line transition-[width] duration-500 ease-out"
          style={{ width: `calc((100% + 12px) * ${reach})` }}
        />
        {keeps.map((k, i) => {
          const on = i < shown;
          const latest = i === shown - 1;
          return (
            <div key={k.text} className="relative min-w-0">
              <span
                aria-hidden
                className={`relative block h-3 w-3 rounded-full border-2 transition-colors duration-300 ${
                  latest
                    ? "border-signal bg-signal shadow-[0_0_0_4px_var(--signal-soft)]"
                    : on
                      ? "border-signal-line bg-surface"
                      : "border-line-2 bg-surface"
                }`}
              />
              <div className={`mt-2 transition-[opacity,transform] duration-300 ease-out ${on ? "opacity-100" : "translate-y-1 opacity-0"}`}>
                <Chip tone={TONE[k.tag]}>{k.tag}</Chip>
                <p className="mt-1.5 line-clamp-2 text-[14px] leading-snug text-ink-2">{k.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AuthRoom({ title, when, lines, you, label }: SceneProps) {
  const reduce = useReducedMotion();
  const script = lines?.length ? lines : DEFAULT_SCENE.lines;
  const name = title ?? DEFAULT_SCENE.title;
  const at = when ?? DEFAULT_SCENE.when;
  const [turn, setTurn] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setTurn((n) => n + 1), TURN_MS);
    return () => clearInterval(t);
  }, [reduce]);

  // Reduced motion holds the room on its decision, with everything the agent kept showing.
  const decisionAt = Math.max(0, script.findIndex((l) => l.keep?.tag === "Decision"));
  const t = reduce ? decisionAt : turn;
  const i = t % script.length;
  const line = script[i];
  const keeps = script.flatMap((l) => (l.keep ? [l.keep] : []));
  const shown = reduce ? keeps.length : script.slice(0, i + 1).filter((l) => l.keep).length;

  const rh = you ? RH_YOU : RH;
  const seat = (n: number) => (
    <Seat key={PEOPLE[n]} seed={PEOPLE[n]} seat={SEATS[n]} rh={rh} talking={!reduce && line.who === n} dl={0.25 + n * 0.09} />
  );

  return (
    <div
      className="auth-room mx-auto"
      // As wide as the panel allows, unless the height left above the headline runs out first:
      // the room's own height is its width scaled by RW:rh, plus ~140px for the kept strip.
      style={{ width: `min(100%, 780px, calc((100cqh - 140px) * ${RW / rh}))` }}
      aria-hidden
    >
      {/* no window frame: the meeting sits straight on the peach stage */}
      <div className="relative w-full [container-type:inline-size]" style={{ aspectRatio: `${RW} / ${rh}` }}>
        {/* the meeting's name and when, in the room's empty top-left corner */}
        <div className="auth-appear absolute left-0 top-0 z-10 max-w-[25%]" style={delay(0.1)}>
          <p className="truncate font-display text-[clamp(16px,3.6cqw,21px)] font-semibold leading-tight tracking-[-0.01em] text-ink">{name}</p>
          <p className="truncate text-[13px] text-ink-3">{at}</p>
        </div>
        <Wall rh={rh} />
        {[0, 1, 2].map(seat)}
        <Table label={label} rh={rh} />
        {[3, 4].map(seat)}

        {you === "empty" ? <OpenSeat dl={0.75} /> : you ? <Seat seed={you} seat={YOU_SEAT} rh={rh} you dl={0.75} /> : null}
        {you ? (
          <span
            className="auth-appear absolute z-30 -translate-y-1/2 whitespace-nowrap rounded-full bg-pill px-2.5 py-0.5 text-[13px] font-semibold text-pill-on"
            style={{ left: pctX(YOU_SEAT.x + YOU_SEAT.d / 2 + 10), top: pctY(YOU_SEAT.y, rh), ...delay(0.85) }}
          >
            {you === "empty" ? "Your seat" : "You"}
          </span>
        ) : null}

        <Bubble key={t} line={line} first={t === 0} rh={rh} />
      </div>

      <KeptStrip keeps={keeps} shown={shown} />
    </div>
  );
}

/* ---------------- below lg: the band's crowd ---------------- */

/** No room for the meeting on small screens, so a few of the people sit beside the band's title. */
export function AuthCrowd({ you }: { you?: string | "empty" }) {
  const seated = you && you !== "empty" ? you : null;
  return (
    <div className="flex items-center" aria-hidden>
      {PEOPLE.slice(0, 4).map((seed, i) => (
        <span
          key={seed}
          className="block h-9 w-9 overflow-hidden rounded-full bg-surface shadow-warm-1 ring-2 ring-surface"
          style={{ marginLeft: i ? -10 : 0, zIndex: 5 - i }}
        >
          <Doodle seed={seed} className="block h-full w-full" />
        </span>
      ))}
      {seated ? (
        <span className="-ml-2.5 block h-10 w-10 overflow-hidden rounded-full bg-surface shadow-warm-2 ring-[3px] ring-signal">
          <Doodle key={seated} seed={seated} className="doodle-pop block h-full w-full" />
        </span>
      ) : null}
      <span className="ml-3 font-display text-[15px] italic text-ink-3">{seated ? "and you" : "your team, remembered"}</span>
    </div>
  );
}
