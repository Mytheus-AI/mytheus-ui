import { Doodle } from "@/components/ui/Doodle";
import { presetFor, type AgentPersonality } from "@/lib/api/profile-types";

/* The agent as it will appear: its face, its name, whose agent it is, and one note written in
   its voice. Pure and hook-free, so it re-renders on every keystroke of the form beside it. It
   reflects the form, so it is not announced on each change; the form fields carry the meaning. */

export function AgentPreviewCard({
  name,
  seed,
  personality,
  instructions,
  ownerName,
  className = "",
}: {
  name: string;
  seed: string;
  personality: AgentPersonality;
  instructions: string;
  /** the person it works for, e.g. "Maya Chen" */
  ownerName: string;
  className?: string;
}) {
  const preset = presetFor(personality);
  const extra = instructions.trim();
  return (
    <section
      aria-label="Preview of your agent"
      className={`overflow-hidden rounded-card border border-line bg-surface shadow-warm-1 ${className}`}
    >
      <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
        <span className="block h-16 w-16 shrink-0 overflow-hidden rounded-full shadow-warm-2 ring-[3px] ring-surface">
          <Doodle seed={seed} className="block h-full w-full" />
        </span>
        <div className="min-w-0">
          <p className="display truncate text-[22px] leading-tight text-ink">{name}</p>
          <p className="mt-1 truncate text-[14px] text-ink-3">
            {preset.label} voice, works for {ownerName.trim().split(/\s+/)[0] || "you"}
          </p>
        </div>
      </div>
      <div className="border-t border-line bg-surface-2 px-4 py-4 sm:px-5">
        <p className="text-[13px] font-semibold text-ink-3">How a note would read</p>
        <p className="mt-1.5 font-display text-[16.5px] italic leading-snug text-ink">&ldquo;{preset.sample}&rdquo;</p>
        {extra ? (
          <p className="mt-2.5 line-clamp-2 break-words text-[13.5px] leading-relaxed text-ink-3">
            <span className="font-semibold text-ink-2">Also follows: </span>
            {extra}
          </p>
        ) : null}
      </div>
    </section>
  );
}
