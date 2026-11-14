import { AgentOrb } from "@/components/agent/AgentOrb";
import { presetFor, type AgentPersonality } from "@/lib/api/profile-types";
import { pageTitleClass } from "@/components/ui/Page";

/* The agent page's opener: the agent drawn large on the peach stage, inside the same dashed
   orbit the sidebar tab uses, its face inking itself in on arrival. Beside it, its name as the
   page title, who it works for, and one note written in its voice, so the page says who this
   is before it says what can be changed. Server component; the face is the agent's live plush
   (AgentOrb, a client leaf: it looks around, blinks, watches the pointer and what is typed in
   the form below, and is a still picture under reduced motion), and the orbit turns once into place and never spins after that. This portrait and the Home hero are the only two
   places in the app that carry the peach wash. The name is the page's h1, at the 34px cap. */

export function AgentPortrait({
  name,
  seed,
  personality,
  ownerFirstName,
  instructions,
  speaking = false,
  level,
}: {
  name: string;
  seed: string;
  personality: AgentPersonality;
  ownerFirstName: string;
  instructions: string | null;
  /** a voice preview is playing: the face speaks, moving with the voice's level */
  speaking?: boolean;
  level?: () => number;
}) {
  const preset = presetFor(personality);
  return (
    <section
      aria-labelledby="agent-name"
      className="relative overflow-hidden rounded-hero px-5 py-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,.35)] sm:px-7 sm:py-7"
      style={{ backgroundImage: "var(--wash-glow), var(--wash)" }}
    >
      <div className="grid items-center gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:gap-8">
        <div className="relative mx-auto grid h-[148px] w-[148px] place-items-center md:mx-0">
          <svg viewBox="0 0 148 148" aria-hidden className="agent-orbit absolute inset-0 h-full w-full overflow-visible">
            <circle cx="74" cy="74" r="70" fill="none" stroke="var(--signal-line)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="74" cy="4" r="5" fill="var(--signal)" stroke="var(--signal-soft)" strokeWidth="4" paintOrder="stroke" />
          </svg>
          <span className="block h-[110px] w-[110px] overflow-hidden rounded-full bg-surface shadow-warm-2 ring-4 ring-surface">
            <AgentOrb seed={seed} mode="live" size={110} followInput="#ag-name, #ag-instructions" state={speaking ? "speaking" : "idle"} level={speaking ? level : undefined} />
          </span>
        </div>

        <div className="min-w-0 text-center md:text-left">
          <p className="text-[12.5px] font-semibold text-signal-ink">Your Myte</p>
          <h1 id="agent-name" className={`${pageTitleClass} mt-1 break-words`}>
            {name}
          </h1>
          <p className="mt-2 text-[15px] text-ink-2">
            Your personal AI agent. It works for {ownerFirstName} in every meeting they join, takes notes only they see, and writes in a {preset.label.toLowerCase()} voice.
          </p>

          <figure className="mt-4 text-left">
            <div className="rounded-card border border-line bg-surface px-4 py-3.5 shadow-warm-1 sm:px-[22px]">
              <figcaption className="text-[12.5px] font-semibold text-ink-3">How it writes your notes</figcaption>
              <blockquote className="mt-1.5 font-display text-[17px]  leading-snug text-ink">{preset.sample}</blockquote>
              {instructions ? (
                <p className="mt-2 text-[14px] text-ink-3">
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
