import type { ReactNode } from "react";
import { Note } from "@/components/settings/primitives";

/* Server-side pieces shared by the brain's pages. No state. */

/** A brain sub-page's title row: serif title, one line of context, an optional aside. */
export function BrainSectionHead({ title, lead, aside }: { title: string; lead: ReactNode; aside?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h2 className="display text-[26px] text-ink sm:text-[28px]">{title}</h2>
        <p className="mt-1.5 max-w-[68ch] text-[15px] leading-relaxed text-ink-3">{lead}</p>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </header>
  );
}

/** What a page shows when its own read failed. */
export function LoadFailed({ what }: { what: string }) {
  return (
    <Note tone="warning">
      {what} could not be loaded just now. Reload the page to try again. Nothing you saved is lost.
    </Note>
  );
}

/** Shown to members, who can read the brain but not change it. */
export function ReadOnlyNote() {
  return <Note>Only workspace owners and admins can change this. You are seeing what every agent reads.</Note>;
}
