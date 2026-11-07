"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Doodle } from "@/components/ui/Doodle";
import { blob, seededRandom, wobble } from "@/lib/doodle";

/* ================================================================== */
/*  The auth stage: a meeting, drawn in a sketchbook.                  */
/*                                                                     */
/*  Doodled people sit around an ink-drawn table and take turns        */
/*  talking in hand-drawn bubbles. When one of them lands a decision,  */
/*  the agent pencils it into the margin. That is the whole product in */
/*  one glance: people talk, the agent remembers.                      */
/*                                                                     */
/*  `you` puts the visitor at the table (their doodle on sign-up, a    */
/*  dashed empty seat until they have one). `label` writes on the      */
/*  table top (the workspace being named on onboarding).               */
/* ================================================================== */

export type Line = { text: string; decision?: boolean };

export type SceneProps = {
  /** what the people at the table say, in turn */
  lines?: Line[];
  /** the margin note the agent writes when a `decision` line is spoken */
  note?: string;
  /** a seed seats the visitor; "empty" shows the open chair */
  you?: string | "empty";
  /** handwritten on the table top */
  label?: string;
};

export const DEFAULT_LINES: Line[] = [
  { text: "Where did we land on pricing?" },
  { text: "Annual plans, 20% off. Agreed?", decision: true },
  { text: "Agreed. I'll update the deck." },
  { text: "Who owns the onboarding copy?" },
  { text: "Me, before Friday's board prep." },
];

const PEOPLE = ["tbl-ava", "tbl-ravi", "tbl-mei", "tbl-jonah", "tbl-sana"];

/* Seat positions as % of the stage box: back row behind the table, front row in front of it. */
const SEATS: { x: number; y: number; back: boolean; size: number }[] = [
  { x: 22, y: 30, back: true, size: 17 },
  { x: 50, y: 22, back: true, size: 17 },
  { x: 78, y: 30, back: true, size: 17 },
  { x: 14, y: 70, back: false, size: 19 },
  { x: 86, y: 70, back: false, size: 19 },
];
const YOU_SEAT = { x: 50, y: 82, back: false, size: 21 };

const INK = "var(--doodle-ink)";

function Table({ label }: { label?: string }) {
  // Seeded, so the table is drawn identically on the server and in the browser.
  const r = seededRandom("auth-table");
  const top = blob(r, 260, 200, 178, 74, 12, 0.025);
  const edge = wobble(r, [[84, 214], [120, 262], [260, 290], [400, 262], [436, 214]], 0.8);
  const ghost = blob(r, 262, 203, 176, 72, 12, 0.03);
  const cup1 = blob(r, 168, 178, 13, 8, 7, 0.06);
  const cup2 = blob(r, 362, 214, 13, 8, 7, 0.06);
  const pad = wobble(r, [[300, 160], [348, 152], [356, 186], [306, 194], [300, 160]], 0.6);
  return (
    <svg viewBox="0 0 520 380" className="absolute inset-0 h-full w-full" aria-hidden>
      <path d={edge} fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" pathLength={1} className="doodle-draw" />
      <path d={top} fill="var(--doodle-paper)" stroke={INK} strokeWidth={2.6} strokeLinejoin="round" pathLength={1} className="doodle-draw" />
      <path d={ghost} fill="none" stroke={INK} strokeWidth={1.2} opacity={0.22} />
      <path d={cup1} fill="var(--doodle-cup)" stroke={INK} strokeWidth={2} pathLength={1} className="doodle-draw" style={{ animationDelay: "300ms" }} />
      <path d={cup2} fill="var(--doodle-cup)" stroke={INK} strokeWidth={2} pathLength={1} className="doodle-draw" style={{ animationDelay: "380ms" }} />
      <path d={pad} fill="var(--doodle-pad)" stroke={INK} strokeWidth={2} strokeLinejoin="round" pathLength={1} className="doodle-draw" style={{ animationDelay: "450ms" }} />
      <path d="M310 168 L340 164 M311 176 L334 173" stroke={INK} strokeWidth={1.4} strokeLinecap="round" opacity={0.55} />
      {label ? (
        <text
          x="250"
          y="222"
          textAnchor="middle"
          className="font-hand"
          fill={INK}
          fontSize="30"
          fontWeight={700}
          transform="rotate(-3 250 222)"
        >
          {label.length > 24 ? `${label.slice(0, 23)}…` : label}
        </text>
      ) : null}
    </svg>
  );
}

function Bubble({ text, decision, seat, k }: { text: string; decision?: boolean; seat: (typeof SEATS)[number]; k: number }) {
  const leftSide = seat.x < 50;
  return (
    <div
      key={k}
      className="doodle-bubble pointer-events-none absolute z-30"
      style={{
        left: `${seat.x}%`,
        top: `${seat.y - seat.size / 2 - 3}%`,
        transform: `translate(${leftSide ? "-18%" : seat.x > 50 ? "-82%" : "-50%"}, -100%)`,
      }}
    >
      <div
        className={`relative w-max max-w-[42cqw] border-[2px] px-[2.6cqw] py-[1.4cqw] text-[clamp(13px,3.7cqw,19px)] leading-[1.15] shadow-[3px_4px_0_var(--doodle-ink)] ${
          decision ? "bg-[var(--doodle-decision)]" : "bg-[var(--doodle-paper)]"
        }`}
        style={{
          borderColor: "var(--doodle-ink)",
          borderRadius: "18px 22px 16px 20px / 20px 16px 22px 18px",
          color: "var(--doodle-ink)",
        }}
      >
        <span className="font-hand font-medium">{text}</span>
        <span
          aria-hidden
          className="absolute -bottom-[9px] h-4 w-4 rotate-45 border-b-[2px] border-r-[2px]"
          style={{
            left: leftSide ? "22%" : seat.x > 50 ? "auto" : "calc(50% - 8px)",
            right: seat.x > 50 ? "22%" : "auto",
            borderColor: "var(--doodle-ink)",
            background: decision ? "var(--doodle-decision)" : "var(--doodle-paper)",
          }}
        />
      </div>
    </div>
  );
}

function Seat({ seed, seat, talking, you }: { seed: string; seat: typeof YOU_SEAT; talking: boolean; you?: boolean }) {
  return (
    <div
      className={`absolute ${seat.back ? "z-0" : "z-20"} transition-transform duration-300`}
      style={{
        left: `${seat.x}%`,
        top: `${seat.y}%`,
        width: `${seat.size}%`,
        transform: `translate(-50%, -50%) ${talking ? "translateY(-4%) rotate(-3deg)" : ""}`,
      }}
    >
      <span
        className={`block aspect-square overflow-hidden rounded-full border-[2.5px] ${talking ? "doodle-talk" : ""} ${
          you ? "shadow-[0_0_0_4px_var(--signal)]" : ""
        }`}
        style={{ borderColor: "var(--doodle-ink)" }}
      >
        <Doodle key={seed} seed={seed} className="doodle-pop block h-full w-full" />
      </span>
    </div>
  );
}

export function DoodleTable({ lines = DEFAULT_LINES, note = "Annual plans, 20% off", you, label }: SceneProps) {
  const reduce = useReducedMotion();
  const [turn, setTurn] = useState(0);
  const [noted, setNoted] = useState(false);

  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setTurn((n) => n + 1), 2900);
    return () => clearInterval(t);
  }, [reduce]);

  const line = lines[turn % lines.length];
  const speaker = (turn * 2 + 1) % SEATS.length; // hop around the table rather than going in order
  useEffect(() => {
    if (line.decision) setNoted(true);
  }, [line.decision]);

  const showNote = noted || reduce;
  const seats = useMemo(() => SEATS.map((s, i) => ({ seat: s, seed: PEOPLE[i] })), []);

  return (
    <div className="doodle-stage relative mx-auto [container-type:inline-size] aspect-[520/380] w-full max-w-[min(520px,calc((100dvh-420px)*1.37))]">
      {seats
        .filter((s) => s.seat.back)
        .map((s) => (
          <Seat key={s.seed} seed={s.seed} seat={{ ...s.seat }} talking={!reduce && seats.indexOf(s) === speaker} />
        ))}
      <Table label={label} />
      {seats
        .filter((s) => !s.seat.back)
        .map((s) => (
          <Seat key={s.seed} seed={s.seed} seat={{ ...s.seat }} talking={!reduce && seats.indexOf(s) === speaker} />
        ))}

      {you ? (
        you === "empty" ? (
          <div
            className="absolute z-20 grid aspect-square place-items-center rounded-full border-[2.5px] border-dashed bg-[var(--doodle-paper)]"
            style={{
              left: `${YOU_SEAT.x}%`,
              top: `${YOU_SEAT.y}%`,
              width: `${YOU_SEAT.size}%`,
              transform: "translate(-50%, -50%)",
              borderColor: "var(--doodle-ink)",
            }}
          >
            <span className="font-hand text-[34px] font-bold leading-none" style={{ color: "var(--doodle-ink)" }}>
              +
            </span>
          </div>
        ) : (
          <Seat seed={you} seat={YOU_SEAT} talking={false} you />
        )
      ) : null}
      {you ? (
        <span
          className="font-hand absolute z-30 text-[clamp(15px,4.4cqw,24px)] font-bold"
          style={{ left: `${YOU_SEAT.x + YOU_SEAT.size / 2 + 2}%`, top: `${YOU_SEAT.y - 2}%`, color: "var(--signal-deep)" }}
        >
          <svg viewBox="0 0 40 20" className="mr-1 inline h-4 w-8 -scale-x-100" aria-hidden>
            <path d="M2 10 C 12 2, 24 18, 36 9 M30 4 L37 9 L30 14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {you === "empty" ? "your seat" : "you"}
        </span>
      ) : null}

      <Bubble text={line.text} decision={line.decision} seat={SEATS[speaker]} k={turn} />

      {/* the agent's margin note */}
      <div
        className={`absolute bottom-[-13%] left-[-5%] z-40 w-[36%] -rotate-[3deg] transition-[opacity,transform] duration-500 ${
          showNote ? "opacity-100" : "translate-y-2 opacity-0"
        }`}
        aria-hidden={!showNote}
      >
        <div
          className="relative border-[2px] bg-[var(--doodle-note)] px-[2.6cqw] pb-[2cqw] pt-[1.6cqw] shadow-[4px_5px_0_var(--doodle-ink)]"
          style={{ borderColor: "var(--doodle-ink)", borderRadius: "6px 10px 8px 12px", color: "var(--doodle-ink)" }}
        >
          <span className="absolute -top-3 left-1/2 h-5 w-14 -translate-x-1/2 -rotate-2 bg-[var(--doodle-tape)] opacity-80" aria-hidden />
          <p className="font-hand flex items-center gap-1.5 text-[clamp(11px,2.9cqw,16px)] font-bold uppercase tracking-wide opacity-70">
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path d="M12 2l2.2 6.6L21 9l-5.4 4.2L17.4 20 12 16.2 6.6 20l1.8-6.8L3 9l6.8-.4z" fill="var(--signal)" stroke="var(--doodle-ink)" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
            Your agent noted
          </p>
          <p className="font-hand mt-0.5 text-[clamp(14px,4cqw,22px)] font-bold leading-[1.1]">
            Decision: <span className="doodle-circle relative inline-block">{note}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
