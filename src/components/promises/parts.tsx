import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CloudSlash } from "@phosphor-icons/react/dist/ssr";
import { EmptyState } from "@/components/ui/EmptyState";
import { RetryRead } from "./RetryRead";

/* Shared pieces for the personal surfaces (promises, status requests, topic watch, the
   notification feed). Server-safe; the dashboard's own parts are not imported because that
   screen is being changed on another branch. */

/** The white card every panel sits in. */
export const panelClass = "overflow-hidden rounded-card border border-line bg-surface shadow-warm-1";

/** A panel head: title (and an optional quiet serif caption) left, a control or count right. */
export function PanelHead({
  id,
  title,
  caption,
  right,
  as: Heading = "h2",
}: {
  id: string;
  title: ReactNode;
  caption?: string;
  right?: ReactNode;
  as?: "h2" | "h3";
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-[18px] pb-2.5 pt-4 sm:px-[22px] sm:pt-[18px]">
      <div className="min-w-0">
        <Heading id={id} className="text-[16px] font-semibold leading-snug text-ink">
          {title}
        </Heading>
        {caption ? <p className="font-display text-[15px] italic leading-snug text-ink-3">{caption}</p> : null}
      </div>
      {right ? <div className="-my-1 flex shrink-0 items-center">{right}</div> : null}
    </div>
  );
}

/** A count in a quiet pill, read with its noun by screen readers. */
export function Count({ n, label }: { n: number; label: string }) {
  return (
    <span className="rounded-full bg-bg-2 px-2.5 py-0.5 text-[12.5px] font-semibold text-ink-2">
      {n}
      <span className="sr-only"> {label}</span>
    </span>
  );
}

/** An empty panel inside a card: the shared EmptyState without its own box. */
export function PanelEmpty({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <EmptyState
      title={title}
      description={text}
      action={action}
      className="!rounded-none !border-0 !bg-transparent !px-6 !pb-8 !pt-4"
    />
  );
}

/** A failed read, distinct from empty: it says we could not load and offers a real retry. */
export function PanelError({ title, text }: { title: string; text: string }) {
  return (
    <div
      role="alert"
      className="mx-[18px] mb-[18px] mt-1.5 flex items-start gap-3.5 rounded-ctl bg-bg-2 p-5 sm:mx-[22px] sm:mb-[22px]"
    >
      <CloudSlash size={24} aria-hidden className="mt-0.5 shrink-0 text-priority-medium" />
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        <p className="mb-3.5 mt-1 max-w-[46ch] text-[14px] text-ink-3">{text}</p>
        <RetryRead />
      </div>
    </div>
  );
}

export const textLinkClass =
  "group/link inline-flex min-h-[40px] items-center gap-1 rounded-ctl px-1 text-[13.5px] font-semibold text-signal-ink underline-offset-4 transition-colors duration-150 hover:underline active:opacity-70";

export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={textLinkClass}>
      {children}
      <ArrowRight
        size={12}
        weight="bold"
        aria-hidden
        className="transition-transform duration-150 motion-safe:group-hover/link:translate-x-0.5"
      />
    </Link>
  );
}

/** A quiet explainer block for a page's side column. */
export function Explainer({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-card bg-bg-2 p-5 sm:p-6">
      <h2 id={id} className="display text-[20px] text-ink">
        {title}
      </h2>
      <div className="mt-2 space-y-2.5 text-[14.5px] leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}
