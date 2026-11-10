"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { List, MagnifyingGlass } from "@phosphor-icons/react";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { AccountMenu } from "@/components/app/AccountMenu";
import { ADMIN_ITEMS, FOOT_ITEMS, NAV_SECTIONS } from "@/components/app/nav";

function titleFor(pathname: string | null): string {
  if (!pathname) return "";
  if (/^\/meetings\/[^/]+\/decisions\/[^/]+$/.test(pathname)) return "Decision lineage";
  if (/^\/meetings\/[^/]+\/collaborations$/.test(pathname)) return "Agent collaboration";
  if (/^\/people\/[^/]+$/.test(pathname)) return "Person";
  if (pathname === "/tenant/usage") return "Usage and budget";
  if (pathname === "/tenant/agents") return "Agent collaboration";
  if (/^\/meetings\/[^/]+\/transcript$/.test(pathname)) return "Transcript";
  if (/^\/meetings\/[^/]+$/.test(pathname)) return "Meeting";
  const all = [...NAV_SECTIONS.flatMap((s) => s.items), ...FOOT_ITEMS, ...ADMIN_ITEMS];
  const hit = all
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return hit?.label ?? "";
}

/* The topbar: menu button (below lg), the screen's name, the search trigger (Cmd/Ctrl+K),
   the theme toggle and the account menu. */
export function Topbar({
  onMenuClick,
  onSearchClick,
}: {
  onMenuClick?: () => void;
  onSearchClick: () => void;
}) {
  const pathname = usePathname();
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
      {/* A paragraph, not a heading: each screen owns its own h1. */}
      <p className="display hidden min-w-0 truncate text-[20px] text-ink-display sm:block">{titleFor(pathname)}</p>

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
          className="hidden shrink-0 rounded-full border border-line-2 bg-surface-2 px-2 py-0.5 font-sans text-[12px] font-semibold text-ink-3 md:inline"
        >
          {mac ? "⌘ K" : "Ctrl K"}
        </kbd>
      </button>

      <ThemeToggle />
      <AccountMenu />
    </header>
  );
}
