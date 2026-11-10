"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { fieldClass } from "@/components/settings/primitives";
import { KIND_LABEL, filterTerms, type GlossaryTerm } from "@/lib/api/org-brain-types";

/* The new joiner's word list: every term with its meaning, in columns on wide screens, with a
   search box once the list is long enough to need one. */

export function WelcomeVocabulary({ terms }: { terms: GlossaryTerm[] }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => filterTerms(terms, query, null), [terms, query]);

  return (
    <div>
      {terms.length > 12 ? (
        <div className="relative mb-4 max-w-[360px]">
          <MagnifyingGlass size={17} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <label htmlFor="welcome-vocab-search" className="sr-only">
            Search the company&apos;s words
          </label>
          <input
            id="welcome-vocab-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${terms.length} words`}
            autoComplete="off"
            className={`${fieldClass} !h-10 !pl-10`}
          />
        </div>
      ) : null}
      <p className="sr-only" role="status" aria-live="polite">
        {query.trim() ? `${shown.length} of ${terms.length} words shown` : ""}
      </p>
      {shown.length === 0 ? (
        <p className="text-[15px] text-ink-3">No word matches &ldquo;{query.trim()}&rdquo;.</p>
      ) : (
        <dl className="gap-x-10 md:columns-2 xl:columns-3">
          {shown.map((t) => (
            <div key={t.id} className="mb-4 break-inside-avoid">
              <dt className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[15.5px] font-semibold text-ink">{t.term}</span>
                <span className="text-[12.5px] font-medium text-ink-3">{KIND_LABEL[t.kind]}</span>
              </dt>
              <dd className="mt-0.5 text-[14.5px] leading-relaxed text-ink-2">
                {t.definition ?? <span className="text-ink-4">No definition yet.</span>}
                {t.aliases.length ? <span className="block text-[13px] text-ink-3">Also said as {t.aliases.join(", ")}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
