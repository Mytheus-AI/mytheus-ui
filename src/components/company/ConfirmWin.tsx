import { Chip, Win, WinBar } from "@/components/site/Section";

/* A small product window showing confirm-before-write: what the agent captured, waiting for a
   person's tap before anything is saved. A picture of the product, so it is one labelled image. */
export function ConfirmWin({ className = "" }: { className?: string }) {
  return (
    <Win
      className={className}
      label="A captured decision in Mytheus, Q3 launch targeted for August 12, waiting for a person to confirm it before it is saved. Below it, context from Raj's Myte and an open conflict with the QA window."
    >
      <WinBar title="Q3 launch sync" meta="3 captured" />
      <ul className="grid gap-2.5 bg-surface-2 p-4 sm:p-5">
        <li className="rounded-ctl border border-line bg-surface px-4 py-3.5">
          <Chip tone="accent">Decision</Chip>
          <p className="mt-1.5 font-medium leading-snug text-ink">Q3 launch targeted for August 12.</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="inline-flex h-9 items-center rounded-ctl bg-pill px-3.5 text-[14px] font-semibold text-pill-on">Confirm</span>
            <span className="text-[14px] text-ink-3">Waiting for your tap.</span>
          </div>
        </li>
        <li className="rounded-ctl border border-line bg-surface px-4 py-3.5">
          <Chip tone="low">Context</Chip>
          <p className="mt-1.5 font-medium leading-snug text-ink">From Raj&apos;s Myte: QA needs 2 more days after the freeze.</p>
        </li>
        <li className="rounded-ctl border border-line bg-surface px-4 py-3.5">
          <Chip tone="high">Conflict</Chip>
          <p className="mt-1.5 font-medium leading-snug text-ink">August 12 collides with the QA window.</p>
        </li>
      </ul>
    </Win>
  );
}
