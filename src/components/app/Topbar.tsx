"use client";

import { usePathname } from "next/navigation";
import { List, MagnifyingGlass } from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { NAV_SECTIONS, ADMIN_ITEMS } from "@/components/app/nav";

function titleFor(pathname: string | null): string {
  if (!pathname) return "";
  if (/^\/meetings\/[^/]+\/room$/.test(pathname)) return "Meeting room";
  if (/^\/meetings\/[^/]+\/transcript$/.test(pathname)) return "Transcript";
  if (/^\/meetings\/[^/]+$/.test(pathname)) return "Meeting";
  const all = [...NAV_SECTIONS.flatMap((s) => s.items), ...ADMIN_ITEMS];
  const hit = all.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  return hit?.label ?? "";
}

export function Topbar({
  onMenuClick,
  onSearchClick,
}: {
  onMenuClick?: () => void;
  onSearchClick: () => void;
}) {
  const pathname = usePathname();

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 px-4 sm:px-6 lg:px-8">
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-pill text-ink-2 transition-colors hover:bg-bg-2 hover:text-ink lg:hidden"
        >
          <List size={20} />
        </button>
      )}
      {/* A paragraph, not a heading: each screen owns its own h1. */}
      <p className="display hidden truncate text-[20px] text-ink-display sm:block">
        {titleFor(pathname)}
      </p>

      <button
        type="button"
        onClick={onSearchClick}
        aria-label="Search or ask Mytheus"
        className="ml-auto flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-pill border border-line bg-surface px-3.5 text-left text-[14px] text-ink-3 transition-colors hover:border-line-2 sm:max-w-[380px]"
      >
        <MagnifyingGlass size={17} className="shrink-0" />
        <span className="flex-1 truncate">Search or ask Mytheus</span>
        <kbd className="hidden shrink-0 rounded-md border border-line-2 bg-bg px-1.5 py-0.5 text-[11.5px] font-semibold text-ink-3 sm:inline">
          ⌘K
        </kbd>
      </button>

      <ThemeToggle />
    </header>
  );
}
