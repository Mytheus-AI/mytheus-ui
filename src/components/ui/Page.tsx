import type { ReactNode } from "react";

/* The one page frame. Every app page sits in a `Page` of one of two widths:
   - `wide` (the default): up to 1320px, for lists, boards and dashboards. Pair it with
     `PageColumns` for a main column and a side column.
   - `read`: the same frame with the content held to 880px and aligned to the frame's left edge, for
     forms and long reading, so a title never jumps sideways between a list page and a form page.
   Skeletons are built from the same frame (`PageSkeleton`), so nothing jumps when content arrives.

   `PageHead` is the title row every page opens with: the serif title (34px at most), one line of
   context, and the page's one primary action on the right. Below 640px the action drops under the
   title. */

export type PageWidth = "wide" | "read";

export function Page({
  width = "wide",
  className = "",
  children,
  label,
}: {
  width?: PageWidth;
  className?: string;
  children: ReactNode;
  /** set on skeletons: the frame then announces itself as loading */
  label?: string;
}) {
  return (
    <div
      role={label ? "status" : undefined}
      aria-label={label}
      className={`mx-auto w-full max-w-[1320px] ${className}`}
    >
      {width === "read" ? <div className="w-full max-w-[880px]">{children}</div> : children}
    </div>
  );
}

/** Main column plus a side column (340px from lg up, 360px from xl); the side column drops under
    the main one below lg. */
export function PageColumns({
  aside,
  asideLabel,
  children,
  sticky = true,
  className = "",
}: {
  aside: ReactNode;
  /** names the side column for screen readers */
  asideLabel?: string;
  children: ReactNode;
  sticky?: boolean;
  className?: string;
}) {
  return (
    <div className={`grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-6 ${className}`}>
      <div className="min-w-0 space-y-5">{children}</div>
      <aside aria-label={asideLabel} className={`min-w-0 space-y-5 ${sticky ? "lg:sticky lg:top-2" : ""}`}>
        {aside}
      </aside>
    </div>
  );
}

/** The page's sections in a responsive grid: one column, two from md, three from xl when asked. */
export function PageGrid({ cols = 2, className = "", children }: { cols?: 2 | 3; className?: string; children: ReactNode }) {
  return (
    <div className={`grid grid-cols-1 items-start gap-5 md:grid-cols-2 ${cols === 3 ? "xl:grid-cols-3" : ""} ${className}`}>{children}</div>
  );
}

export const pageTitleClass = "display text-[clamp(28px,3vw,34px)] text-ink-display";

export function PageHead({
  title,
  context,
  action,
  liveContext = false,
  children,
  id,
}: {
  title: ReactNode;
  /** one line of context under the title */
  context?: ReactNode;
  /** the page's one primary action (and at most one quiet companion) */
  action?: ReactNode;
  /** announce context changes (a count that changes as the person works) */
  liveContext?: boolean;
  /** extra lines under the context (a status notice, for example) */
  children?: ReactNode;
  id?: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-6 pt-2 sm:pb-7">
      <div className="min-w-0 flex-[1_1_320px]">
        <h1 id={id} className={pageTitleClass}>
          {title}
        </h1>
        {context ? (
          <p className="mt-2 max-w-[75ch] text-[15px] leading-normal text-ink-3" aria-live={liveContext ? "polite" : undefined}>
            {context}
          </p>
        ) : null}
        {children}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2.5">{action}</div> : null}
    </header>
  );
}

/** The row under a console's tabs (My work, Workspace): the tab's one line of context on the
    left and its own action on the right. The console's PageHead holds the one h1. */
export function SectionBar({
  context,
  action,
  liveContext = false,
  title,
}: {
  context?: ReactNode;
  action?: ReactNode;
  liveContext?: boolean;
  /** an h2 for the tab, when it needs a visible name of its own */
  title?: ReactNode;
}) {
  if (!context && !action && !title) return null;
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 flex-[1_1_320px]">
        {title ? <h2 className="display text-[22px] text-ink-display">{title}</h2> : null}
        {context ? (
          <p className={`${title ? "mt-1" : ""} max-w-[75ch] text-[15px] leading-normal text-ink-3`} aria-live={liveContext ? "polite" : undefined}>
            {context}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2.5">{action}</div> : null}
    </div>
  );
}

/* ---------------- skeletons ---------------- */

/** A skeleton block: the one skeleton style (`.mx-bone`: hidden for 150 ms, then a gentle pulse
    only when motion is allowed). */
export function Bone({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`mx-bone block rounded-ctl bg-bg-2 ${className}`} />;
}

/** The title row's skeleton, the same height as a real PageHead. */
export function PageHeadSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-6 pt-2 sm:pb-7">
      <div className="min-w-0 flex-[1_1_320px]">
        <Bone className="h-[34px] w-64 max-w-full" />
        <Bone className="mt-3 h-4 w-[420px] max-w-full" />
      </div>
      {action ? <Bone className="h-11 w-36" /> : null}
    </div>
  );
}

/** A card's skeleton: a title bar then `rows` two-line rows. */
export function CardSkeleton({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`rounded-card border border-line bg-surface px-4 py-[18px] shadow-warm-1 sm:px-[22px] ${className}`}>
      <Bone className="h-4 w-32" />
      <div className="mt-5 flex flex-col gap-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Bone className="h-4 w-[85%]" />
            <Bone className="h-3 w-[45%]" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A tab row's skeleton, for consoles with section tabs. */
export function TabsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mb-6 flex gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <Bone key={i} className="h-10 w-28" />
      ))}
    </div>
  );
}

/**
 * A whole page's skeleton, from the same frame as the page:
 * - `list`: one wide card of rows.
 * - `columns`: a main column of cards and a side column (pages built with PageColumns).
 * - `grid`: two cards side by side, then one across.
 * - `form`: the reading width with stacked form cards.
 */
export function PageSkeleton({
  label = "Loading",
  layout = "grid",
  width,
  action = false,
  tabs = 0,
}: {
  label?: string;
  layout?: "list" | "columns" | "grid" | "form";
  width?: PageWidth;
  action?: boolean;
  /** draw a tab row of this many tabs under the title */
  tabs?: number;
}) {
  const w: PageWidth = width ?? (layout === "form" ? "read" : "wide");
  return (
    <Page width={w} label={label}>
      <PageHeadSkeleton action={action} />
      {tabs ? <TabsSkeleton count={tabs} /> : null}
      {layout === "list" ? (
        <CardSkeleton rows={6} />
      ) : layout === "columns" ? (
        <PageColumns aside={<CardSkeleton rows={3} />} sticky={false}>
          <CardSkeleton rows={4} />
          <CardSkeleton rows={3} />
        </PageColumns>
      ) : layout === "form" ? (
        <div className="flex flex-col gap-5">
          <CardSkeleton rows={3} />
          <CardSkeleton rows={2} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <CardSkeleton rows={3} />
          <CardSkeleton rows={3} />
          <CardSkeleton rows={2} className="md:col-span-2" />
        </div>
      )}
      <span className="sr-only">{label}</span>
    </Page>
  );
}
