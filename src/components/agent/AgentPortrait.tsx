import { Doodle } from "@/components/ui/Doodle";
import { presetFor, type AgentPersonality } from "@/lib/api/profile-types";

/* The agent page's opener: the agent drawn large on the peach stage, inside the same dashed
   orbit the sidebar tab uses, its face inking itself in on arrival. Beside it, its name as the
   page title, who it works for, and one note written in its voice, so the page says who this
   is before it says what can be changed. Server component; the only motion is the face drawing
   once (`Doodle draw`), which reduced motion shows finished. */

export function AgentPortrait({
  name,
  seed,
  personality,
  ownerFirstName,
  instructions,
}: {
  name: string;
  seed: string;
  personality: AgentPersonality;
  ownerFirstName: string;
  instructions: string | null;
}) {
  const preset = presetFor(personality);
  return (
    <section
      aria-labelledby="agent-name"
      className="relative overflow-hidden rounded-hero px-5 py-7 shadow-[inset_0_0_0_1px_rgba(255,255,255,.35)] sm:px-8 sm:py-9"
      style={{ backgroundImage: "var(--wash-glow), var(--wash)" }}
    >
      <div className="grid items-center gap-7 md:grid-cols-[auto_minmax(0,1fr)] md:gap-10">
        <div className="relative mx-auto grid h-[168px] w-[168px] place-items-center md:mx-0">
          <svg viewBox="0 0 168 168" aria-hidden className="agent-orbit absolute inset-0 h-full w-full">
            <circle cx="84" cy="84" r="80" fill="none" stroke="var(--signal-line)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="84" cy="4" r="5" fill="var(--signal)" stroke="var(--signal-soft)" strokeWidth="4" paintOrder="stroke" />
          </svg>
          <span className="block h-[136px] w-[136px] overflow-hidden rounded-full bg-surface shadow-warm-2 ring-4 ring-surface">
            <Doodle seed={seed} draw className="block h-full w-full" />
          </span>
        </div>

        <div className="min-w-0 text-center md:text-left">
          <p className="text-[13px] font-semibold text-signal-ink">Your agent</p>
          <h1 id="agent-name" className="display mt-1 break-words text-[clamp(2.2rem,5vw,3.2rem)] leading-[1.02] text-ink">
            {name}
          </h1>
          <p className="mt-2 text-[15.5px] text-ink-2">
            Works for {ownerFirstName}, in every meeting you join. Writes in a {preset.label.toLowerCase()} voice.
          </p>

          <figure className="mt-5 text-left">
            <div className="rounded-card border border-line bg-surface px-4 py-3.5 shadow-warm-1 sm:px-5">
              <figcaption className="text-[12.5px] font-semibold text-ink-3">How it writes your notes</figcaption>
              <blockquote className="mt-1.5 font-display text-[18px] italic leading-snug text-ink">{preset.sample}</blockquote>
              {instructions ? (
                <p className="mt-2 text-[13.5px] text-ink-3">
                  Also: <span className="text-ink-2">{instructions}</span>
                </p>
              ) : null}
            </div>
          </figure>
        </div>
      </div>
    </section>
  );
}
