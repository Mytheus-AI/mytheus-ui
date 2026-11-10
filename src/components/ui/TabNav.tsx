"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Icon } from "@phosphor-icons/react";

/* Section tabs for a page with sub-pages (My work, Workspace, Settings, the company brain's
   sections). Links, not ARIA tabs: each tab is its own route, so the current one carries
   aria-current and Tab walks them in order. The current tab looks like the sidebar's current item:
   a white card and a coral icon, nothing more.

   `horizontal` is one row that scrolls sideways when it runs out of room; `vertical` is a list
   beside the content from lg up and the same sideways row below. */

export type TabItem = { href: string; label: string; icon?: Icon; count?: number | null; dot?: boolean | null; dotLabel?: string };

export function TabNav({
  items,
  label,
  orientation = "horizontal",
  exact = [],
  className = "",
}: {
  items: TabItem[];
  /** names the nav for screen readers ("My work sections") */
  label: string;
  orientation?: "horizontal" | "vertical";
  /** hrefs that match only exactly (an overview tab whose siblings live under its path) */
  exact?: string[];
  className?: string;
}) {
  const pathname = usePathname() ?? "";
  const current =
    items
      .filter((t) => pathname === t.href || (!exact.includes(t.href) && pathname.startsWith(`${t.href}/`)))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
  const vertical = orientation === "vertical";

  return (
    <nav aria-label={label} className={`-mx-4 min-w-0 sm:mx-0 ${vertical ? "lg:sticky lg:top-4" : ""} ${className}`}>
      <ul
        className={`flex gap-1 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:px-0 [&::-webkit-scrollbar]:hidden ${
          vertical ? "lg:flex-col lg:gap-0.5 lg:overflow-visible lg:py-0" : ""
        }`}
      >
        {items.map((t) => {
          const active = current === t.href;
          const I = t.icon;
          return (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 items-center gap-2.5 whitespace-nowrap rounded-ctl px-3.5 text-[14px] font-semibold transition-[background-color,color,transform] duration-150 motion-safe:active:scale-[0.98] ${
                  vertical ? "lg:h-11" : ""
                } ${active ? "bg-surface text-ink" : "text-ink-3 hover:bg-bg-2 hover:text-ink"}`}
              >
                {I ? <I size={19} weight={active ? "fill" : "regular"} className={active ? "text-signal" : undefined} aria-hidden /> : null}
                <span className={vertical ? "lg:flex-1" : ""}>{t.label}</span>
                {t.count ? (
                  <span className="rounded-full bg-signal-soft px-2 py-px text-[12.5px] font-semibold tabular-nums text-signal-ink">
                    {t.count}
                    <span className="sr-only"> waiting</span>
                  </span>
                ) : null}
                {t.dot === undefined || t.dot === null ? null : (
                  <>
                    <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${t.dot ? "bg-signal" : "border-[1.5px] border-ink-4"}`} />
                    <span className="sr-only">{t.dotLabel ?? (t.dot ? "(ready)" : "(needs work)")}</span>
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
