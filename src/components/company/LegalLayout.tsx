import type { ReactNode } from "react";
import { Wrap } from "@/components/site/Section";
import { Prose } from "@/components/marketing/Prose";

/* The legal page layout: a serif title and the last-updated line, then the document in Prose.
   On wide screens an on-page contents list stays beside the text as you read; on narrow screens
   the same list folds into a disclosure above the text. Server component, no script. */

export type LegalSection = { id: string; title: string; body: ReactNode };

function Contents({ sections }: { sections: LegalSection[] }) {
  return (
    <ol className="space-y-0.5">
      {sections.map((s) => (
        <li key={s.id}>
          <a
            href={`#${s.id}`}
            className="block rounded-ctl px-3 py-1.5 text-[15px] leading-snug text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            {s.title}
          </a>
        </li>
      ))}
    </ol>
  );
}

export function LegalLayout({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <section className="pb-[clamp(72px,9vw,120px)] pt-[clamp(48px,6vw,88px)]">
      <Wrap>
        <header className="max-w-[68ch] lg:ml-[calc(240px+64px)]">
          <p className="kicker">Legal</p>
          <h1 className="display mt-4 text-[clamp(2.6rem,5.6vw,4.25rem)] leading-[1] tracking-[-0.03em]">{title}</h1>
          <p className="mt-5 text-[15px] text-ink-3">Last updated: {updated}</p>
        </header>

        <div className="mt-[clamp(32px,4.5vw,56px)] grid gap-x-16 gap-y-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="lg:order-none">
            <details className="group rounded-card border border-line bg-surface lg:hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 text-[15px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                On this page
                <span aria-hidden className="relative h-4 w-4">
                  <span className="absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2 rounded-full bg-signal-line" />
                  <span className="absolute left-0 top-1/2 h-0.5 w-4 -translate-y-1/2 rotate-90 rounded-full bg-signal-line transition-transform duration-200 group-open:rotate-0 motion-reduce:transition-none" />
                </span>
              </summary>
              <nav aria-label="On this page" className="border-t border-line px-1 py-2">
                <Contents sections={sections} />
              </nav>
            </details>
            <nav aria-label="On this page" className="sticky top-28 hidden lg:block">
              <p className="kicker mb-2 px-3">On this page</p>
              <Contents sections={sections} />
            </nav>
          </aside>

          <Prose>
            {sections.map((s) => (
              <section key={s.id} aria-labelledby={s.id} className="mt-14 first:mt-0">
                <h2 id={s.id}>{s.title}</h2>
                {s.body}
              </section>
            ))}
          </Prose>
        </div>
      </Wrap>
    </section>
  );
}
