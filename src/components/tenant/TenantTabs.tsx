"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Buildings, ChartBar, DownloadSimple, Handshake, Lifebuoy, SlidersHorizontal, UsersThree } from "@phosphor-icons/react";

/* Section switcher for the tenant admin console. A horizontal pill row that scrolls on narrow
   screens. */

const TABS = [
  { href: "/tenant", label: "Overview", icon: Buildings },
  { href: "/tenant/members", label: "Members", icon: UsersThree },
  { href: "/tenant/settings", label: "Settings", icon: SlidersHorizontal },
  { href: "/tenant/usage", label: "Usage and budget", icon: ChartBar },
  { href: "/tenant/agents", label: "Agent collaboration", icon: Handshake },
  { href: "/tenant/support", label: "Support access", icon: Lifebuoy },
  { href: "/tenant/data", label: "Data export", icon: DownloadSimple },
] as const;

export function TenantTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Workspace admin sections" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0">
      {TABS.map((t) => {
        const active = pathname === t.href;
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-10 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-pill border px-3.5 text-[14px] font-semibold transition-colors duration-150 focus-visible:!rounded-pill ${
              active ? "border-line bg-surface text-ink shadow-sm" : "border-transparent text-ink-3 hover:bg-bg-2 hover:text-ink"
            }`}
          >
            <Icon size={18} weight={active ? "fill" : "regular"} className={active ? "text-signal-deep" : undefined} aria-hidden />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
