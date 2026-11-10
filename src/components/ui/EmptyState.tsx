import type { ReactNode } from "react";

/* An empty view is an invitation to act: a short title that says what will appear here, one
   sentence on how to get it there, and the action. Above it the coral line forms something about
   the screen (a scale for decisions, a tick for tasks, a tray for the inbox...), drawn once when
   it appears and simply there under reduced motion (`.mx-draw` in app-theme.css). Distinct from
   `ErrorState`, whose line frays: empty means "nothing yet", never "could not load". */

export type EmptyArt =
  | "line"
  | "decisions"
  | "tasks"
  | "inbox"
  | "promises"
  | "updates"
  | "people"
  | "search"
  | "notes"
  | "meetings"
  | "brain"
  | "billing"
  | "agent"
  | "watch"
  | "members"
  | "calendar"
  | "done";

/* Each drawing is one or two strokes in a 120 x 64 box; every element carries pathLength 1 so the
   draw animation (dash offset 1 to 0) times the same whatever the stroke's length. */
const ART: Record<EmptyArt, ReactNode> = {
  line: <path pathLength={1} d="M4 50 C24 50 30 50 44 50 C62 50 72 26 60 26 C48 26 50 50 70 50 C86 50 96 50 116 50" />,
  // a balance: the line rises to a beam with two pans
  decisions: (
    <>
      <path pathLength={1} d="M4 56 H52 C56 56 60 54 60 48 V14 M38 18 H82" />
      <path pathLength={1} d="M38 18 L30 34 H46 Z M82 18 L74 34 H90 Z" style={{ ["--dl" as string]: "0.6s" }} />
    </>
  ),
  // the line ends in a tick inside a box
  tasks: (
    <>
      <path pathLength={1} d="M4 40 C18 40 24 40 34 40" />
      <path pathLength={1} d="M44 16 H84 Q90 16 90 22 V50 Q90 56 84 56 H44 Q38 56 38 50 V22 Q38 16 44 16 Z" style={{ ["--dl" as string]: "0.3s" }} />
      <path pathLength={1} d="M50 36 L60 46 L80 26" style={{ ["--dl" as string]: "0.7s" }} />
    </>
  ),
  // a tray the line dips into
  inbox: (
    <>
      <path pathLength={1} d="M4 30 H30 L40 50 H80 L90 30 H116" />
      <path pathLength={1} d="M30 30 V14 H90 V30" style={{ ["--dl" as string]: "0.5s" }} />
    </>
  ),
  // a loop tied into a knot: a promise kept
  promises: (
    <path pathLength={1} d="M4 48 C26 48 34 48 44 40 C54 32 50 16 40 20 C30 24 44 46 60 46 C76 46 90 22 76 18 C64 15 66 40 84 48 C94 52 104 50 116 50" />
  ),
  // a speech bubble the line writes
  updates: (
    <>
      <path pathLength={1} d="M4 52 H24 L30 44 H36 Q30 44 30 38 V18 Q30 12 36 12 H92 Q98 12 98 18 V38 Q98 44 92 44 H40" />
      <path pathLength={1} d="M42 24 H84 M42 32 H70" style={{ ["--dl" as string]: "0.7s" }} />
    </>
  ),
  // two heads joined by one line
  people: (
    <>
      <circle pathLength={1} cx="38" cy="22" r="9" />
      <circle pathLength={1} cx="82" cy="22" r="9" style={{ ["--dl" as string]: "0.3s" }} />
      <path pathLength={1} d="M22 56 C22 42 54 42 54 56 M66 56 C66 42 98 42 98 56 M47 22 H73" style={{ ["--dl" as string]: "0.55s" }} />
    </>
  ),
  // the line loops into a lens
  search: (
    <>
      <circle pathLength={1} cx="56" cy="28" r="15" />
      <path pathLength={1} d="M67 39 L84 56 H116 M4 28 H41" style={{ ["--dl" as string]: "0.45s" }} />
    </>
  ),
  // lines of notes kept from a meeting
  notes: (
    <>
      <path pathLength={1} d="M4 16 C10 16 14 16 20 16 H100" />
      <path pathLength={1} d="M20 30 H88 M20 44 H72" style={{ ["--dl" as string]: "0.45s" }} />
      <path pathLength={1} d="M72 44 C80 44 82 52 90 52 H116" style={{ ["--dl" as string]: "0.8s" }} />
    </>
  ),
  // a call window the line runs through
  meetings: (
    <>
      <path pathLength={1} d="M30 14 H78 Q84 14 84 20 V46 Q84 52 78 52 H30 Q24 52 24 46 V20 Q24 14 30 14 Z" />
      <path pathLength={1} d="M84 28 L98 20 V46 L84 38 M4 33 H24" style={{ ["--dl" as string]: "0.5s" }} />
    </>
  ),
  // a spiral: what the company knows, wound in
  brain: <path pathLength={1} d="M4 50 H40 C60 50 74 40 74 28 C74 18 66 12 58 12 C48 12 42 20 42 28 C42 36 48 40 56 40 C62 40 66 36 66 30 C66 26 62 22 58 22" />,
  // a receipt with a torn edge
  billing: (
    <>
      <path pathLength={1} d="M36 8 H84 V56 L78 52 L72 56 L66 52 L60 56 L54 52 L48 56 L42 52 L36 56 Z" />
      <path pathLength={1} d="M46 22 H74 M46 32 H66 M4 40 H28" style={{ ["--dl" as string]: "0.6s" }} />
    </>
  ),
  // the agent's dashed orbit with the line arriving
  agent: (
    <>
      <circle pathLength={1} cx="60" cy="32" r="20" />
      <path pathLength={1} d="M4 32 H32" style={{ ["--dl" as string]: "0.5s" }} />
      <path pathLength={1} d="M52 30 Q60 38 68 30" style={{ ["--dl" as string]: "0.8s" }} />
    </>
  ),
  // an eye: a topic watched
  watch: (
    <>
      <path pathLength={1} d="M20 32 C34 12 86 12 100 32 C86 52 34 52 20 32 Z" />
      <circle pathLength={1} cx="60" cy="32" r="8" style={{ ["--dl" as string]: "0.55s" }} />
    </>
  ),
  members: (
    <>
      <circle pathLength={1} cx="60" cy="20" r="10" />
      <path pathLength={1} d="M38 56 C38 38 82 38 82 56 M4 56 H30 M90 56 H116" style={{ ["--dl" as string]: "0.45s" }} />
    </>
  ),
  calendar: (
    <>
      <path pathLength={1} d="M32 14 H88 Q94 14 94 20 V52 Q94 58 88 58 H32 Q26 58 26 52 V20 Q26 14 32 14 Z M26 26 H94" />
      <path pathLength={1} d="M44 8 V18 M76 8 V18 M48 42 L56 48 L72 36" style={{ ["--dl" as string]: "0.6s" }} />
    </>
  ),
  // everything settled: the line ends in a tick
  done: <path pathLength={1} d="M4 40 C20 40 30 40 40 40 L52 52 L80 18 C86 12 96 12 116 12" />,
};

export function EmptyArtwork({ art = "line", className = "" }: { art?: EmptyArt; className?: string }) {
  return (
    <svg viewBox="0 0 120 64" aria-hidden className={`mx-draw line-stroke ${className}`}>
      {ART[art]}
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
  art = "line",
  inCard = false,
  compact = false,
  className = "",
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** what the line draws */
  art?: EmptyArt;
  /** sits inside a card that is already the box: no border or fill of its own */
  inCard?: boolean;
  /** less vertical room, for side panels */
  compact?: boolean;
  className?: string;
}) {
  const frame = inCard ? "" : "rounded-card border border-dashed border-line-2 bg-surface-2";
  const pad = compact ? "px-5 py-8" : inCard ? "px-6 pb-9 pt-6" : "px-6 py-14";
  return (
    <div className={`flex flex-col items-center justify-center text-center ${frame} ${pad} ${className}`}>
      <EmptyArtwork art={art} className={`mb-4 ${compact ? "h-10 w-[75px]" : "h-14 w-[105px]"}`} />
      <p className="display text-[22px] leading-tight text-ink-display">{title}</p>
      {description ? <p className="mt-2 max-w-[46ch] text-[15px] leading-relaxed text-ink-3">{description}</p> : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
