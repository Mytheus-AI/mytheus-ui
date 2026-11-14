import type { ReactNode } from "react";
import { cardClass } from "@/components/ui/Card";
import { Bone, CardHeadSkeleton, PageHeadSkeleton, SectionBarSkeleton, TextBone } from "@/components/ui/Page";

/* Skeleton pieces the Workspace console and the ops console share, built on the shared kit and on
   the same classes as the real pieces: a titled SectionBar, a StatCard, a SectionCard and a
   table of rows. Server components, nothing focusable. */

/** SectionBar with a title (the tab's h2, display 22px), its context lines and its action. */
export function TitledBarSkeleton({
  title = "w-40",
  context = ["w-[560px]"],
  narrow = [],
  action,
}: {
  title?: string;
  context?: string[];
  narrow?: string[];
  action?: ReactNode;
}) {
  return (
    <SectionBarSkeleton title={title} context={context} narrow={narrow} actions={action ?? undefined} />
  );
}

/** StatCard's skeleton: the label, the 30px serif figure and the hint, at their line heights. */
export function StatCardSkeleton() {
  return (
    <div aria-hidden className={cardClass({ className: "min-w-0" })}>
      <TextBone className="text-[12.5px] font-semibold" widths={["w-24"]} />
      <TextBone className="display mt-2 text-[30px] leading-none" widths={["w-14"]} />
      <TextBone className="mt-2 text-[12.5px]" widths={["w-32"]} />
    </div>
  );
}

/** SectionCard's skeleton: the head (title and description) over a hairline, then its rows. */
export function SectionCardSkeleton({
  title = "w-44",
  description = ["w-[70%]"],
  right,
  children,
  className = "",
}: {
  title?: string;
  description?: string[];
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div aria-hidden className={cardClass({ flush: true, className })}>
      <CardHeadSkeleton title={title} description={description.length ? description : undefined} right={right} className="!pb-4" />
      <div className="divide-y divide-line border-t border-line">{children}</div>
    </div>
  );
}

/** A table's skeleton inside a flush card (`.mx-table`): from 640px the raised head row and `rows`
    hairline rows; below it each row stacks into its label and value pairs, as the table does. */
export function TableSkeleton({
  rows = 4,
  avatar = false,
  cols = 3,
  fields = 0,
  meta = false,
}: {
  rows?: number;
  avatar?: boolean;
  cols?: number;
  /** cells that hold a text field (a 44px input) instead of a chip */
  fields?: number;
  /** a second, smaller line under each row's first cell (an id, an email) */
  meta?: boolean;
}) {
  return (
    <div aria-hidden>
      <div className="hidden items-center gap-10 border-b border-line bg-surface-2 py-2.5 pl-[22px] pr-5 sm:flex">
        {Array.from({ length: cols }, (_, i) => (
          <TextBone key={i} className="text-[12.5px] font-semibold" widths={[i === 0 ? "w-20" : "w-14"]} />
        ))}
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i}>
            <div className="hidden items-center gap-3 py-3 pl-[22px] pr-5 sm:flex">
              {avatar ? <Bone className="h-9 w-9 shrink-0 !rounded-full" /> : null}
              <div className="min-w-0 flex-1">
                <TextBone className="text-[14px]" widths={[i % 2 ? "w-36" : "w-44"]} />
                {avatar ? <TextBone className="text-[14px]" widths={["w-52 max-w-full"]} /> : null}
                {meta ? <TextBone className="text-[12.5px]" widths={["w-40"]} /> : null}
              </div>
              {fields ? (
                Array.from({ length: fields }, (_, f) => <Bone key={f} className="h-11 w-[120px]" />)
              ) : (
                <Bone className="h-[23px] w-16 !rounded-full" />
              )}
            </div>
            <div className="px-4 py-3 sm:hidden">
              <div className="flex items-center gap-3 py-1">
                {avatar ? <Bone className="h-9 w-9 shrink-0 !rounded-full" /> : null}
                <div className="min-w-0 flex-1">
                  <TextBone className="text-[14px]" widths={["w-40"]} />
                  {avatar ? <TextBone className="text-[14px]" widths={["w-48 max-w-full"]} /> : null}
                  {meta ? <TextBone className="text-[12.5px]" widths={["w-40"]} /> : null}
                </div>
              </div>
              {Array.from({ length: cols - 1 }, (_, c) => (
                <div key={c} className="py-1">
                  <TextBone className="mb-0.5 text-[12.5px] font-semibold" widths={["w-16"]} />
                  {c >= cols - 1 - fields ? <Bone className="h-11 w-[120px]" /> : <TextBone className="text-[14px]" widths={["w-28"]} />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Note's skeleton: the quiet well with its icon and the note's lines. */
export function NoteSkeleton({ lines = ["w-[90%]"], narrow = [] }: { lines?: string[]; narrow?: string[] }) {
  return (
    <div aria-hidden className="flex items-start gap-2.5 rounded-ctl bg-bg-2 px-3.5 py-3 text-[14px] leading-relaxed">
      <Bone className="mt-0.5 h-[18px] w-[18px] shrink-0 !rounded-full bg-bg-3" />
      <TextBone className="min-w-0" widths={lines} narrow={narrow} />
    </div>
  );
}

/** A form row (FieldRow): the label and help on the left, the field on the right from md up. */
export function FieldRowSkeleton({ help = true }: { help?: boolean }) {
  return (
    <div aria-hidden className="grid gap-2.5 px-4 py-4 sm:px-[22px] md:grid-cols-[minmax(0,1fr)_minmax(220px,340px)] md:gap-x-8 md:py-[18px]">
      <div className="min-w-0">
        <TextBone className="text-[15px] font-semibold" widths={["w-32"]} />
        {help ? <TextBone className="mt-0.5 text-[14px] leading-relaxed" widths={["w-[80%]"]} /> : null}
      </div>
      <Bone className="h-11 w-full" />
    </div>
  );
}

/** EmptyState's skeleton inside a card (`inCard`, or `compact`): the drawing, the serif title and
    the description, at the same padding. */
export function EmptyStateSkeleton({ compact = false, lines = ["w-[46ch] max-w-full", "w-[30ch] max-w-full"] }: { compact?: boolean; lines?: string[] }) {
  return (
    <div aria-hidden className={`flex flex-col items-center justify-center text-center ${compact ? "px-5 py-8" : "px-6 pb-9 pt-6"}`}>
      <Bone className={`mb-4 ${compact ? "h-10 w-[75px]" : "h-14 w-[105px]"}`} />
      <TextBone className="display text-[22px] leading-tight" widths={["w-44"]} />
      <TextBone className="mt-2 flex w-full flex-col items-center text-[15px] leading-relaxed" widths={lines} />
    </div>
  );
}

/** BrainSectionHead's skeleton: a brain section's 22px serif title and its lead (68ch). */
export function BrainHeadSkeleton({ title = "w-40", lead = ["w-[620px]", "w-60"], narrow = ["w-[60%]"] }: { title?: string; lead?: string[]; narrow?: string[] }) {
  return (
    <div aria-hidden className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 flex-1">
        <TextBone className="display text-[22px]" widths={[title]} />
        <TextBone className="mt-1.5 max-w-[68ch] text-[15px] leading-relaxed" widths={lead} narrow={narrow} />
      </div>
    </div>
  );
}

/** A quiet well in a side column (an explainer): a small title and a few lines. */
export function WellSkeleton({ title = "w-36", lines = ["w-full", "w-[80%]"], className = "" }: { title?: string; lines?: string[]; className?: string }) {
  return (
    <div aria-hidden className={cardClass({ tone: "well", className })}>
      <TextBone className="text-[15px] font-semibold" widths={[title]} />
      <TextBone className="mt-2 text-[14px] leading-relaxed" widths={lines} />
    </div>
  );
}

/** The ops console's Tenants tab: its title row, the three figures, the filter and the directory. */
export function OpsTenantsSkeleton() {
  return (
    <>
      <OpsHeadSkeleton title="w-36" context={["w-[620px]"]} narrow={["w-[50%]"]} />
      <KpiStripSkeleton count={3} />
      <div className="flex flex-col gap-4">
        <Bone className="h-11 w-full max-w-sm" />
        <div aria-hidden className={cardClass({ flush: true })}>
          <TableSkeleton rows={5} cols={5} meta />
        </div>
      </div>
    </>
  );
}

/* --- the ops console (sidebar frame) -------------------------------------------------------- */

/** An ops page's title row (PageHead: the h1 and its context), drawn inside a gap-5 column, so it
    pulls the column's gap back to keep the content where the loaded page puts it. */
export function OpsHeadSkeleton({ title = "w-40", context = ["w-[560px]"], narrow = [] }: { title?: string; context?: string[]; narrow?: string[] }) {
  return (
    <div className="-mb-5">
      <PageHeadSkeleton title={title} context={context} narrow={narrow} />
    </div>
  );
}

/** KpiStrip's skeleton: one card split into `count` figures by hairlines. */
export function KpiStripSkeleton({ count = 3 }: { count?: number }) {
  const cols = count >= 5 ? "lg:grid-cols-5" : count === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
  return (
    <div aria-hidden className="overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
      <div className={`grid grid-cols-1 min-[480px]:grid-cols-2 ${cols}`}>
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className="flex flex-col gap-1 border-line px-4 py-[18px] sm:px-[22px] [&:not(:last-child)]:border-b min-[480px]:[&:nth-child(odd)]:border-r lg:border-b-0 lg:[&:not(:last-child)]:border-r"
          >
            <TextBone className="text-[13px] font-semibold" widths={["w-24"]} />
            <TextBone className="display text-[32px] leading-none" widths={["w-16"]} />
            <TextBone className="mt-1 text-[13px]" widths={["w-36"]} />
          </div>
        ))}
      </div>
    </div>
  );
}
