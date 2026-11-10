"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import { Plus } from "@phosphor-icons/react";
import { LogoMark } from "@/components/Logo";
import { Doodle } from "@/components/ui/Doodle";
import { blob, defaultDoodleSeed, seededRandom, wobble } from "@/lib/doodle";

/* ================================================================== */
/*  The brand-panel scene on every auth page: a meeting, with doodles. */
/*                                                                     */
/*  Doodle people sit around a table and take turns talking in small   */
/*  white bubbles. When one of them lands a decision, the agent keeps  */
/*  it on a card and the coral line loops round the words. People      */
/*  talk, the agent remembers: the product in one glance.              */
/*                                                                     */
/*  Drawn in the one-line language: the table top is the coral line,  */
/*  drawn once on arrival; everything else is white cards, warm        */
/*  shadows and paper tints. `you` seats the visitor (their doodle on  */
/*  sign-up and onboarding, a dashed open seat until they have one);   */
/*  `label` writes the workspace name on the table while it is typed.  */
/*  Decorative only: the panel's headline carries the meaning.         */
/* ================================================================== */

export type Line = { text: string; decision?: boolean };

export type SceneProps = {
  /** what the people at the table say, in turn */
  lines?: Line[];
  /** what the agent keeps when a `decision` line is spoken */
  note?: string;
  /** a doodle seed seats the visitor; "empty" shows the open seat */
  you?: string | "empty";
  /** written on the table top (the workspace being named) */
  label?: string;
};

export const DEFAULT_LINES: Line[] = [
  { text: "Where did we land on pricing?" },
  { text: "Annual plans, 20% off. Agreed?", decision: true },
  { text: "Agreed. I'll update the deck." },
  { text: "Who owns the onboarding copy?" },
  { text: "Me, before Friday's board prep." },
];
const DEFAULT_NOTE = "Annual plans, 20% off";

/* The sample people (docs/DESIGN-ONELINE.md), with the same faces `Avatar` draws for them. */
const PEOPLE = ["Maya", "Raj", "Priya", "Sarah", "Diego"].map((name) => defaultDoodleSeed(name));

type SeatPos = { x: number; y: number; back: boolean; size: number };

/* Seat positions as % of the scene box: back row behind the table, front row in front of it. */
const SEATS: SeatPos[] = [
  { x: 22, y: 30, back: true, size: 16 },
  { x: 50, y: 21, back: true, size: 16 },
  { x: 78, y: 30, back: true, size: 16 },
  { x: 13, y: 70, back: false, size: 18 },
  { x: 87, y: 70, back: false, size: 18 },
];
const YOU_SEAT: SeatPos = { x: 50, y: 83, back: false, size: 19 };

const TURN_MS = 2900;

const delay = (dl: number) => ({ ["--dl" as string]: `${dl}s` }) as CSSProperties;
const timing = (du: number, dl: number) => ({ ["--du" as string]: `${du}s`, ["--dl" as string]: `${dl}s` }) as CSSProperties;

/* ---------------- the table ---------------- */

function Table({ label }: { label?: string }) {
  // Seeded, so the table is drawn identically on the server and in the browser.
  const r = seededRandom("auth-table");
  const top = blob(r, 260, 198, 178, 72, 12, 0.025);
  const slab = blob(r, 260, 214, 176, 70, 12, 0.025);
  const cup1 = blob(r, 170, 178, 13, 8, 7, 0.06);
  const cup2 = blob(r, 360, 212, 13, 8, 7, 0.06);
  const pad = wobble(r, [[296, 160], [346, 152], [354, 186], [302, 194], [296, 160]], 0.6);
  const shown = label ? (label.length > 24 ? `${label.slice(0, 23).trimEnd()}…` : label) : "";
  return (
    <svg viewBox="0 0 520 380" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
      {/* the table's thickness, then its top: the one coral line in the scene */}
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
        <path d="M306 168 L336 164 M307 176 L330 173" stroke="var(--ink-4)" strokeWidth={1.4} strokeLinecap="round" opacity={0.6} />
      </g>
      {shown ? (
        <text
          x="250"
          y="224"
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

function seatBox(seat: SeatPos): CSSProperties {
  return { left: `${seat.x}%`, top: `${seat.y}%`, width: `${seat.size}%`, transform: "translate(-50%, -50%)" };
}

function Seat({ seed, seat, talking, you, dl }: { seed: string; seat: SeatPos; talking?: boolean; you?: boolean; dl: number }) {
  const ring = you ? "ring-signal" : talking ? "ring-signal-line" : "ring-surface";
  return (
    <div className={`absolute ${seat.back ? "z-0" : "z-20"}`} style={seatBox(seat)}>
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
  return (
    <div className="absolute z-20" style={seatBox(YOU_SEAT)}>
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

function Bubble({ text, decision, seat, first }: { text: string; decision?: boolean; seat: SeatPos; first: boolean }) {
  const side = seat.x < 50 ? "left" : seat.x > 50 ? "right" : "middle";
  return (
    <div
      className="room-bubble pointer-events-none absolute z-30"
      style={{
        left: `${seat.x}%`,
        // seat sizes are % of the width; the box is 520 x 380, so a face's radius in height % is larger
        top: `${seat.y - (seat.size / 2) * (520 / 380) - 1.5}%`,
        transform: `translate(${side === "left" ? "-18%" : side === "right" ? "-82%" : "-50%"}, -100%)`,
        ...delay(first ? 1.1 : 0),
      }}
    >
      <div
        className={`relative w-max max-w-[44cqw] rounded-card px-[3cqw] py-[1.7cqw] text-[clamp(13px,3.1cqw,16px)] leading-snug shadow-warm-2 ring-1 ${
          decision ? "bg-signal-soft font-semibold text-signal-ink ring-signal-line" : "bg-surface text-ink-2 ring-line"
        }`}
      >
        {text}
        <span
          aria-hidden
          className={`absolute -bottom-[6px] h-3 w-3 rotate-45 border-b border-r ${
            decision ? "border-signal-line bg-signal-soft" : "border-line bg-surface"
          }`}
          style={side === "left" ? { left: "20%" } : side === "right" ? { right: "20%" } : { left: "calc(50% - 6px)" }}
        />
      </div>
    </div>
  );
}

/* ---------------- what the agent keeps ---------------- */

function Kept({ note, show }: { note: string; show: boolean }) {
  return (
    <div
      className={`absolute bottom-[-10%] left-[-6%] z-40 w-max max-w-[52%] transition-[opacity,transform] duration-500 ease-out ${
        show ? "opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div className="rounded-card bg-surface px-[3.4cqw] pb-[2.8cqw] pt-[2.3cqw] shadow-warm-3 ring-1 ring-line">
        <p className="flex items-center gap-1.5 text-[clamp(12.5px,2.7cqw,13px)] font-semibold text-ink-3">
          <LogoMark size={15} />
          Your agent kept
        </p>
        <p className="mt-1.5 font-display text-[clamp(15px,3.8cqw,20px)] font-medium leading-tight tracking-[-0.01em] text-ink">
          <span className="relative inline-block">
            {note}
            {/* the coral line loops round what was decided, as it circles the key phrase on the site */}
            {show ? (
              <svg
                viewBox="0 0 200 60"
                preserveAspectRatio="none"
                className="pointer-events-none absolute -left-[9px] -top-[5px] h-[calc(100%+12px)] w-[calc(100%+18px)] overflow-visible"
                aria-hidden
              >
                <path
                  d="M 30 7 C 90 -3, 188 3, 195 27 C 201 50, 126 59, 64 55 C 16 51, 1 38, 8 22 C 14 10, 36 5, 58 6"
                  fill="none"
                  stroke="var(--signal-line)"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  pathLength={1}
                  className="auth-draw"
                  style={timing(0.8, 0.25)}
                />
              </svg>
            ) : null}
          </span>
        </p>
      </div>
    </div>
  );
}

/* ---------------- the scene ---------------- */

export function AuthRoom({ lines = DEFAULT_LINES, note = DEFAULT_NOTE, you, label }: SceneProps) {
  const reduce = useReducedMotion();
  const [turn, setTurn] = useState(0);
  const [keptFor, setKeptFor] = useState<string | null>(null);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setTurn((n) => n + 1), TURN_MS);
    return () => clearInterval(t);
  }, [reduce]);

  // Reduced motion holds the scene on its decision, with the agent's card already showing.
  const decisionAt = Math.max(0, lines.findIndex((l) => l.decision));
  const t = reduce ? decisionAt : turn;
  const line = lines[t % lines.length];
  const speaker = (t * 2 + 1) % SEATS.length; // hop round the table rather than going in order

  useEffect(() => {
    if (line.decision) setKeptFor(note);
  }, [line.decision, note]);
  const showKept = Boolean(reduce) || keptFor === note;

  const seats = useMemo(() => SEATS.map((seat, i) => ({ seat, seed: PEOPLE[i], i })), []);
  const seat = (s: (typeof seats)[number]) => (
    <Seat key={s.seed} seed={s.seed} seat={s.seat} talking={!reduce && s.i === speaker} dl={0.25 + s.i * 0.09} />
  );

  return (
    <div
      className="auth-room relative mx-auto aspect-[520/380] w-full max-w-[min(520px,calc((100dvh-400px)*1.37))] [container-type:inline-size]"
      aria-hidden
    >
      {seats.filter((s) => s.seat.back).map(seat)}
      <Table label={label} />
      {seats.filter((s) => !s.seat.back).map(seat)}

      {you === "empty" ? <OpenSeat dl={0.75} /> : you ? <Seat seed={you} seat={YOU_SEAT} you dl={0.75} /> : null}
      {you ? (
        <span
          className="auth-appear absolute z-30 -translate-y-1/2 whitespace-nowrap rounded-full bg-pill px-2.5 py-0.5 text-[13px] font-semibold text-pill-on"
          style={{ left: `${YOU_SEAT.x + YOU_SEAT.size / 2 + 2}%`, top: `${YOU_SEAT.y}%`, ...delay(0.85) }}
        >
          {you === "empty" ? "Your seat" : "You"}
        </span>
      ) : null}

      <Bubble key={t} text={line.text} decision={line.decision} seat={SEATS[speaker]} first={t === 0} />

      <Kept note={note} show={showKept} />
    </div>
  );
}

/* ---------------- below lg: the band's crowd ---------------- */

/** No room for the table on small screens, so a few of the people sit beside the band's title. */
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
