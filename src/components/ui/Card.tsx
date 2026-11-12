import type { HTMLAttributes, ReactNode } from "react";

/* The one card. A white surface on the stage with one padding: 16px (22px from sm) across and
   18px down. Priority is shown by a Chip or an icon on the content (frozen colour language: red =
   act now, amber = attention, blue = info), never by a coloured edge bar.

   Two shapes:
   - `<Card>` alone: padded content.
   - `<Card flush>` with a `<CardHead>` and rows or a `<CardBody>`: the head and body carry the same
     padding themselves, so a list or table can run edge to edge with hairlines between rows.
   `tone="well"` is the quiet inset block for explainers in a side column; `tone="danger"` the
   separated card for destructive actions. */

/** Horizontal card padding, for rows, cells and footers that sit inside a flush card. */
export const cardPadX = "px-4 sm:px-[22px]";
/** The full card padding. */
export const cardPad = "px-4 py-[18px] sm:px-[22px]";

type Tone = "default" | "well" | "danger";

const toneClass: Record<Tone, string> = {
  default: "border border-line bg-surface shadow-warm-1",
  well: "bg-bg-2",
  danger: "border border-[color:color-mix(in_srgb,var(--priority-high)_35%,var(--line))] bg-surface shadow-warm-1",
};

export function cardClass({ tone = "default", flush = false, clip = true, className = "" }: { tone?: Tone; flush?: boolean; clip?: boolean; className?: string } = {}) {
  return `relative rounded-card ${clip ? "overflow-hidden" : ""} ${toneClass[tone]} ${flush ? "" : cardPad} ${className}`;
}

export function Card({
  as: Tag = "div",
  tone = "default",
  flush = false,
  clip = true,
  className = "",
  children,
  ...rest
}: {
  as?: "div" | "section" | "article" | "aside" | "li";
  tone?: Tone;
  /** no padding of its own: a CardHead and rows or a CardBody carry it */
  flush?: boolean;
  /** clip children to the rounded corners (off for cards that hold a popover, such as a picker) */
  clip?: boolean;
  className?: string;
} & HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cardClass({ tone, flush, clip, className })} {...rest}>
      {children}
    </Tag>
  );
}

/** A card's title row: the 17px semibold title (optionally a quiet  serif caption under it,
    or a line of description), and a control or count on the right. */
export function CardHead({
  id,
  title,
  caption,
  description,
  right,
  as: Heading = "h2",
  tone = "default",
  divided = false,
  className = "",
}: {
  id?: string;
  title: ReactNode;
  /** the quiet serif voice, such as "Before your next meetings" */
  caption?: ReactNode;
  /** one plain sentence about the card */
  description?: ReactNode;
  right?: ReactNode;
  as?: "h2" | "h3";
  tone?: "default" | "danger";
  /** a hairline under the head, for a card whose rows start straight after it */
  divided?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-2 ${cardPadX} pt-[18px] ${
        divided ? "border-b border-line pb-4" : "pb-3"
      } ${className}`}
    >
      <div className="min-w-0 flex-[1_1_16rem]">
        <Heading id={id} className={`text-[17px] font-semibold leading-snug ${tone === "danger" ? "text-priority-high" : "text-ink"}`}>
          {title}
        </Heading>
        {caption ? <p className="font-display text-[15px]  leading-snug text-ink-3">{caption}</p> : null}
        {description ? <p className="mt-1 max-w-[68ch] text-[14px] leading-relaxed text-ink-3">{description}</p> : null}
      </div>
      {right ? <div className="-my-1 flex shrink-0 items-center gap-2">{right}</div> : null}
    </div>
  );
}

/** The padded body of a flush card, under its head. */
export function CardBody({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`${cardPadX} pb-[18px] ${className}`}>{children}</div>;
}

/** A footer strip for a flush card: the primary action first. */
export function CardFoot({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-surface-2 py-3.5 ${cardPadX} ${className}`}>{children}</div>;
}

/** A quiet explainer for a page's side column: a well with a small serif title. */
export function Explainer({ id, title, children, className = "" }: { id: string; title: string; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={cardClass({ tone: "well", className: `sm:!p-6 ${className}` })}>
      <h2 id={id} className="display text-[22px] text-ink">
        {title}
      </h2>
      <div className="mt-2 space-y-2.5 text-[15px] leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

/** A titled card of rows divided by hairlines (settings, admin): a flush Card with a CardHead,
    then each child as a row. `tone="danger"` is the separated card for destructive actions. */
export function SectionCard({
  title,
  description,
  aside,
  children,
  className = "",
  headingLevel = 2,
  headingId,
  tone = "default",
  clip = true,
}: {
  title?: string;
  description?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  headingLevel?: 2 | 3;
  headingId?: string;
  tone?: "default" | "danger";
  clip?: boolean;
}) {
  const danger = tone === "danger";
  const divide = danger ? "divide-[color:color-mix(in_srgb,var(--priority-high)_18%,var(--line))]" : "divide-line";
  const edge = danger ? "border-[color:color-mix(in_srgb,var(--priority-high)_18%,var(--line))]" : "border-line";
  return (
    <Card as="section" flush tone={danger ? "danger" : "default"} clip={clip} aria-labelledby={title && headingId ? headingId : undefined} className={className}>
      {title ? (
        <CardHead id={headingId} title={title} description={description} right={aside} as={headingLevel === 2 ? "h2" : "h3"} tone={tone} className="!pb-4" />
      ) : null}
      <div className={`divide-y ${divide} ${title ? `border-t ${edge}` : ""}`}>{children}</div>
    </Card>
  );
}
