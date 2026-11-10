"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { List, MagnifyingGlass } from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { AccountMenu } from "@/components/app/AccountMenu";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import { useCrumbLabel, useCrumbParent } from "@/components/app/Crumb";
import { breadcrumbFor } from "@/components/app/breadcrumbs";

/* The topbar: menu button (below lg), a breadcrumb on detail pages only (Meetings / the meeting /
   Transcript), the search trigger (Cmd/Ctrl+K), the theme toggle and the account menu. Top-level
   pages show no title here: the page's own h1 is the one title on screen. */
export function Topbar({
  onMenuClick,
  onSearchClick,
}: {
  onMenuClick?: () => void;
  onSearchClick: () => void;
}) {
  const pathname = usePathname();
  const crumbs = breadcrumbFor(pathname, useCrumbLabel(), useCrumbParent());
  // The server cannot know the platform, so the first render says Ctrl K and a Mac swaps it after
  // mount (hydration-safe). The label beside it is flexible, so nothing else moves.
  const [mac, setMac] = useState(false);
  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);

  return (
    <header className="flex h-[68px] shrink-0 items-center gap-2.5 px-4 sm:gap-3 sm:px-6 lg:px-8">
      {onMenuClick ? (
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          aria-haspopup="dialog"
          className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-ctl text-ink-2 transition-colors hover:bg-bg-2 hover:text-ink lg:hidden"
        >
          <List size={20} aria-hidden />
        </button>
      ) : null}
      {crumbs ? (
        <nav aria-label="Breadcrumb" className="hidden min-w-0 sm:block">
          <ol className="flex min-w-0 items-center gap-1.5 text-[14px]">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li key={`${i}-${c.label}`} className={`flex items-center gap-1.5 ${last ? "min-w-0" : "shrink-0"}`}>
                  {i > 0 ? <CaretRight size={12} weight="bold" aria-hidden className="shrink-0 text-ink-4" /> : null}
                  {last || !c.href ? (
                    <span aria-current={last ? "page" : undefined} className="max-w-[46ch] truncate font-semibold text-ink">
                      {c.label}
                    </span>
                  ) : (
                    <Link href={c.href} className="inline-flex min-h-10 items-center rounded-ctl font-semibold text-ink-3 transition-colors hover:text-ink">
                      {c.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}

      <button
        type="button"
        onClick={onSearchClick}
        aria-label="Search or ask Mytheus"
        aria-keyshortcuts="Meta+K Control+K"
        aria-haspopup="dialog"
        className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-ctl border border-line bg-surface px-3.5 text-left text-[14px] text-ink-3 transition-[border-color,box-shadow] duration-150 hover:border-line-2 hover:shadow-warm-1 sm:ml-auto sm:max-w-[380px]"
      >
        <MagnifyingGlass size={17} aria-hidden className="shrink-0" />
        <span className="flex-1 truncate">Search or ask Mytheus</span>
        <kbd
          aria-hidden
          className="hidden shrink-0 rounded-full border border-line-2 bg-surface-2 px-2 py-0.5 font-sans text-[12.5px] font-semibold text-ink-3 md:inline"
        >
          {mac ? "⌘ K" : "Ctrl K"}
        </kbd>
      </button>

      <ThemeToggle />
      <AccountMenu />
    </header>
  );
}
