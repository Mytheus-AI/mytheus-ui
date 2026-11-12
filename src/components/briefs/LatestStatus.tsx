import { ChatCircleText } from "@phosphor-icons/react/ssr";
import type { LatestStatus as LatestStatusValue } from "@/lib/api/meeting-brain-types";

/* An open action's latest status (mytheus-docs ADR-0039 B7): what its owner said when asked
   before this meeting, and when. Shown under the action in the brief and in Carried forward.
   Without one it says so quietly, so "no answer" never reads as "no progress". Tailwind tokens
   only, so it renders the same on the meeting page and the dashboard. */

const when = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function answeredAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : when.format(d);
}

export function LatestStatus({ status, ownerName }: { status: LatestStatusValue | null | undefined; ownerName?: string | null }) {
  if (!status) {
    return <span className="text-[12.5px]  text-ink-3">No status update yet</span>;
  }
  const at = answeredAt(status.answered_at);
  return (
    <span className="inline-flex max-w-full flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[14px] leading-snug text-ink-2">
      <ChatCircleText size={14} aria-hidden="true" className="relative top-0.5 shrink-0 text-signal-ink" />
      <span className="min-w-0 [overflow-wrap:anywhere]">
        <span className="sr-only">Latest status{ownerName ? ` from ${ownerName}` : ""}: </span>
        {status.text}
      </span>
      {at ? <span className="text-[12.5px] text-ink-3">{at}</span> : null}
    </span>
  );
}
