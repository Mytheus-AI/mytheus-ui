import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/Button";
import { cardClass, cardPadX } from "@/components/ui/Card";
import { chipClass } from "@/components/ui/Chip";

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
  /** set on skeletons: the frame is then busy and says, once and politely, what is loading */
  label?: string;
}) {
  return (
    <div aria-busy={label ? true : undefined} className={`mx-auto w-full max-w-[1320px] ${className}`}>
      {label ? <LoadingLabel label={label} /> : null}
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

/* ---------------- skeletons ----------------

   The one skeleton kit. Every loading.tsx draws its page from the same frame and classes the page
   uses (Page, PageHead's row, Card, the page's own grid), and sizes its placeholders from real line
   boxes: `TextBone` holds an invisible line set in the same type as the text it stands for, and
   `ShapeBone` an invisible copy of a control's label inside the control's own classes, so the
   content lands where the bones were. Bones pulse only when motion is allowed (`.mx-bone`), the
   frame is aria-busy with one polite "Loading ..." line, and nothing in a skeleton takes focus. */

/** The one polite announcement a skeleton makes. */
export function LoadingLabel({ label }: { label: string }) {
  return (
    <span role="status" className="sr-only">
      {label}
    </span>
  );
}

/** A skeleton block: the one skeleton style (`.mx-bone`: hidden for 150 ms, then a gentle pulse
    only when motion is allowed). */
export function Bone({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`mx-bone block rounded-ctl bg-bg-2 ${className}`} />;
}

/** The busy frame for a skeleton that is not a whole Page: a tab's body inside a console layout
    (My work, Workspace, Settings), whose title and tabs stay put while it loads. */
export function SkeletonSection({ label, className = "", children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div aria-busy className={className}>
      <LoadingLabel label={label} />
      {children}
    </div>
  );
}

function Line({ w, className = "" }: { w: string; className?: string }) {
  return (
    <span className={`relative block max-w-full ${w} ${className}`}>
      {"\u00a0"}
      <Bone className="absolute inset-x-0 top-1/2 h-[0.72em] -translate-y-1/2" />
    </span>
  );
}

/**
 * Lines of text as bones, each exactly one line box of the type in `className` (font size and
 * leading), so a title or a paragraph takes the same height loaded or not.
 * - `widths`: one entry per line, at every width.
 * - `narrow`: extra lines only below 640px, where the same text wraps.
 */
export function TextBone({ className = "", widths = ["w-48"], narrow = [] }: { className?: string; widths?: string[]; narrow?: string[] }) {
  return (
    <div aria-hidden className={className}>
      {widths.map((w, i) => (
        <Line key={i} w={w} />
      ))}
      {narrow.map((w, i) => (
        <Line key={`n${i}`} w={w} className="sm:hidden" />
      ))}
    </div>
  );
}

/** A bone the exact size of a real control: the control's own classes around an invisible copy of
    its label, the bone laid over it. */
export function ShapeBone({ className = "", children, round = false }: { className?: string; children?: ReactNode; round?: boolean }) {
  return (
    <span aria-hidden className={`relative ${className}`}>
      <span className="invisible contents">{children}</span>
      <Bone className={`absolute inset-0 h-full w-full ${round ? "!rounded-full" : ""}`} />
    </span>
  );
}

/** A Button's bone, from the Button's own size classes and its label (and its 16px icon). */
export function ButtonBone({ label, size = "md", icon = false, className = "" }: { label: string; size?: "sm" | "md" | "lg"; icon?: boolean; className?: string }) {
  return (
    <ShapeBone className={buttonClass({ size, variant: "ghost", className: `!transition-none ${className}` })}>
      {icon ? <span className="inline-block h-4 w-4" /> : null}
      {label}
    </ShapeBone>
  );
}

/** A Chip's bone, from the Chip's own classes and a sample label. */
export function ChipBone({ label = "Sample", className = "" }: { label?: string; className?: string }) {
  return (
    <ShapeBone round className={chipClass("neutral", `!bg-transparent ${className}`)}>
      {label}
    </ShapeBone>
  );
}

/**
 * The title row's skeleton, built on PageHead's own row: the serif title line, the context line(s)
 * and the action buttons (pass their labels, so each bone is the button's real width).
 */
export function PageHeadSkeleton({
  title = "w-56",
  titleNarrow = [],
  context = ["w-[420px]"],
  narrow = [],
  action = [],
  actions,
  children,
}: {
  /** the title bone's width */
  title?: string;
  /** extra title lines below 640px, where a long title wraps */
  titleNarrow?: string[];
  /** one width per context line; `false` for a head without context */
  context?: string[] | false;
  /** extra context lines below 640px */
  narrow?: string[];
  /** the action buttons' labels (md buttons with an icon); `true` for one typical button */
  action?: string[] | boolean;
  /** the action area drawn by hand, for anything other than md buttons (chips, a picker, an
      icon button); replaces `action` */
  actions?: ReactNode;
  /** more lines under the context (a status line, chips) */
  children?: ReactNode;
}) {
  const labels = action === true ? ["New meeting"] : action === false ? [] : action;
  const right =
    actions ??
    (labels.length ? (
      <>
        {labels.map((a) => (
          <ButtonBone key={a} label={a} icon />
        ))}
      </>
    ) : null);
  return (
    <div aria-hidden className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pb-6 pt-2 sm:pb-7">
      <div className="min-w-0 flex-[1_1_320px]">
        <TextBone className={pageTitleClass} widths={[title]} narrow={titleNarrow} />
        {context ? <TextBone className="mt-2 max-w-[75ch] text-[15px] leading-normal" widths={context} narrow={narrow} /> : null}
        {children}
      </div>
      {right ? <div className="flex shrink-0 flex-wrap items-center gap-2.5">{right}</div> : null}
    </div>
  );
}

/** SectionBar's skeleton: a tab's optional 22px title, its line of context and its action, inside
    a console layout. */
export function SectionBarSkeleton({
  title,
  context = ["w-[460px]"],
  narrow = [],
  action = [],
  actionSize = "md",
  actions,
}: {
  /** the h2's width, for a tab with a visible name */
  title?: string;
  context?: string[] | false;
  narrow?: string[];
  action?: string[];
  actionSize?: "sm" | "md";
  /** the action area drawn by hand; replaces `action` */
  actions?: ReactNode;
}) {
  const right =
    actions ??
    (action.length ? (
      <>
        {action.map((a) => (
          <ButtonBone key={a} label={a} size={actionSize} icon />
        ))}
      </>
    ) : null);
  return (
    <div aria-hidden className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 flex-[1_1_320px]">
        {title ? <TextBone className="display text-[22px]" widths={[title]} /> : null}
        {context ? <TextBone className={`${title ? "mt-1" : ""} max-w-[75ch] text-[15px] leading-normal`} widths={context} narrow={narrow} /> : null}
      </div>
      {right ? <div className="flex shrink-0 flex-wrap items-center gap-2.5">{right}</div> : null}
    </div>
  );
}

/** A TabNav's skeleton, from TabNav's own row and item classes and the tabs' real labels. */
export function TabsSkeleton({
  labels,
  count = 4,
  orientation = "horizontal",
  icons = true,
  className = "mb-6",
}: {
  labels?: string[];
  count?: number;
  orientation?: "horizontal" | "vertical";
  icons?: boolean;
  className?: string;
}) {
  const vertical = orientation === "vertical";
  const items = labels ?? Array.from({ length: count }, () => "Section tab");
  return (
    <div aria-hidden className={`-mx-4 min-w-0 sm:mx-0 ${className}`}>
      <div className={`flex gap-1 overflow-hidden px-4 py-1 sm:px-0 ${vertical ? "lg:flex-col lg:gap-0.5 lg:py-0" : ""}`}>
        {items.map((l, i) => (
          <div key={i} className="shrink-0">
            <span
              className={`relative flex h-10 items-center gap-2.5 whitespace-nowrap rounded-ctl px-3.5 text-[14px] font-semibold ${vertical ? "lg:h-11" : ""}`}
            >
              {icons ? <span className="h-[19px] w-[19px] shrink-0" /> : null}
              <span className={`invisible ${vertical ? "lg:flex-1" : ""}`}>{l}</span>
              <Bone className="absolute inset-x-2 top-1/2 h-5 -translate-y-1/2" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A card's skeleton: a title bar then `rows` two-line rows, in the padded Card. */
export function CardSkeleton({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div aria-hidden className={cardClass({ className })}>
      <TextBone className="text-[17px] font-semibold leading-snug" widths={["w-36"]} />
      <div className="mt-3 flex flex-col gap-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i}>
            <TextBone className="text-[15px] leading-snug" widths={["w-[85%]"]} />
            <TextBone className="mt-1 text-[14px] leading-normal" widths={["w-[45%]"]} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** CardHead's skeleton: the same padding, the 17px title line, an optional description and a
    control on the right. */
export function CardHeadSkeleton({
  title = "w-36",
  description,
  right,
  divided = false,
  className = "",
}: {
  title?: string;
  /** widths of description lines */
  description?: string[];
  /** a button label (or chip) on the right */
  right?: ReactNode;
  divided?: boolean;
  className?: string;
}) {
  return (
    <div aria-hidden className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-2 ${cardPadX} pt-[18px] ${divided ? "border-b border-line pb-4" : "pb-3"} ${className}`}>
      <div className="min-w-0 flex-[1_1_16rem]">
        <TextBone className="text-[17px] font-semibold leading-snug" widths={[title]} />
        {description ? <TextBone className="mt-1 max-w-[68ch] text-[14px] leading-relaxed" widths={description} /> : null}
      </div>
      {right ? <div className="-my-1 flex shrink-0 items-center gap-2">{right}</div> : null}
    </div>
  );
}

/** One list row's skeleton: an optional lead (a 40px tile or a round avatar), a title line and a
    meta line, and an optional chip on the right. */
export function RowSkeleton({
  lead = null,
  title = "w-[62%]",
  meta = "w-[38%]",
  chip = false,
  className = "py-4",
}: {
  lead?: "tile" | "avatar" | "avatar-sm" | null;
  title?: string;
  meta?: string | null;
  chip?: boolean | string;
  className?: string;
}) {
  return (
    <div aria-hidden className={`flex items-center gap-3.5 sm:gap-4 ${cardPadX} ${className}`}>
      {lead === "tile" ? <Bone className="h-10 w-10 shrink-0" /> : null}
      {lead === "avatar" ? <Bone className="h-10 w-10 shrink-0 !rounded-full" /> : null}
      {lead === "avatar-sm" ? <Bone className="h-8 w-8 shrink-0 !rounded-full" /> : null}
      <div className="min-w-0 flex-1">
        <TextBone className="text-[15px] leading-snug" widths={[title]} />
        {meta ? <TextBone className="mt-1 text-[14px] leading-normal" widths={[meta]} /> : null}
      </div>
      {chip ? <ChipBone label={typeof chip === "string" ? chip : "Sample"} className="shrink-0" /> : null}
    </div>
  );
}

/** A flush Card of rows divided by hairlines, with an optional head: the shape of every list card. */
export function ListCardSkeleton({
  head = "w-36",
  headRight,
  rows = 4,
  row = {},
  className = "",
}: {
  /** the head's title width; `false` for a card that is only rows */
  head?: string | false;
  headRight?: ReactNode;
  rows?: number;
  row?: Parameters<typeof RowSkeleton>[0];
  className?: string;
}) {
  return (
    <div aria-hidden className={cardClass({ flush: true, className })}>
      {head ? <CardHeadSkeleton title={head} right={headRight} divided /> : null}
      <div className="divide-y divide-line">
        {Array.from({ length: rows }, (_, i) => (
          <RowSkeleton key={i} {...row} />
        ))}
      </div>
    </div>
  );
}

/**
 * The fallback skeleton for a screen that has none of its own, from the same frame:
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
  action?: boolean | string[];
  /** draw a tab row of this many tabs under the title */
  tabs?: number;
}) {
  const w: PageWidth = width ?? (layout === "form" ? "read" : "wide");
  return (
    <Page width={w} label={label}>
      <PageHeadSkeleton action={action} />
      {tabs ? <TabsSkeleton count={tabs} /> : null}
      {layout === "list" ? (
        <ListCardSkeleton head={false} rows={6} row={{ lead: "tile" }} />
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
        <PageGrid>
          <CardSkeleton rows={3} />
          <CardSkeleton rows={3} />
          <CardSkeleton rows={2} className="md:col-span-2" />
        </PageGrid>
      )}
    </Page>
  );
}
