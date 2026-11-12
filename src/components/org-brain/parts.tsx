import type { ReactNode } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { ErrorState } from "@/components/ui/ErrorState";
import { Note } from "@/components/ui/Note";
import type { MemberOption } from "@/components/ui/MemberPicker";

/* Pieces shared by the company brain's pages that the shared kit does not cover. No state. */

/** A brain section's title row inside the Workspace console: the section's name (h2, display
    22px), one line of context, and an optional aside. The console's PageHead holds the h1. */
export function BrainSectionHead({ title, lead, aside }: { title: string; lead: ReactNode; aside?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h2 className="display text-[22px] text-ink-display">{title}</h2>
        <p className="mt-1.5 max-w-[68ch] text-[15px] leading-relaxed text-ink-3">{lead}</p>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </header>
  );
}

/** What a page shows when its own read failed: the frayed-line error with Retry. */
export function LoadFailed({ what }: { what: string }) {
  return <ErrorState title={`${what} could not be loaded`} text="Nothing you saved is lost. Try again in a moment." />;
}

/** Shown to members, who can read the brain but not change it. */
export function ReadOnlyNote() {
  return <Note>Only workspace owners and admins can change this. You are seeing what every Myte reads.</Note>;
}

/** A person's face and name in a list, or a quiet line when they are not in the member list. */
export function PersonLine({ member, fallback = "Not in the workspace" }: { member: MemberOption | null | undefined; fallback?: string }) {
  if (!member)
    return (
      <span className="inline-flex min-w-0 items-center gap-2 text-ink-3">
        <span className="h-7 w-7 shrink-0 rounded-full border border-dashed border-line-2" aria-hidden />
        <span className="truncate">{fallback}</span>
      </span>
    );
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar name={member.name} id={member.email} src={member.imageUrl} size="sm" />
      <span className="truncate font-medium text-ink">{member.name}</span>
    </span>
  );
}
