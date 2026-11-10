"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartBar, Handshake, UsersThree } from "@phosphor-icons/react";

/* Section switcher for the workspace admin console. A horizontal row in the same language as the
   settings nav (raised white tab for the current page): the console has three sections, which
   does not earn a side rail. Scrolls sideways on a narrow screen rather than wrapping. */

const TABS = [
  { href: "/tenant", label: "Overview", icon: UsersThree },
  { href: "/tenant/usage", label: "Usage and budget", icon: ChartBar },
  { href: "/tenant/agents", label: "Agent collaboration", icon: Handshake },
] as const;

export function TenantTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Workspace admin sections" className="-mx-4 min-w-0 sm:mx-0">
      <ul className="flex gap-1.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:px-0 [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const active = pathname === t.href;
          const Icon = t.icon;
          return (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 items-center gap-2.5 whitespace-nowrap rounded-ctl border px-3.5 text-[14.5px] font-semibold transition-[background-color,color,border-color,transform] duration-150 focus-visible:!rounded-ctl active:scale-[0.98] motion-reduce:active:scale-100 ${
                  active ? "border-line bg-surface text-ink shadow-warm-1" : "border-transparent text-ink-3 hover:bg-bg-2 hover:text-ink"
                }`}
              >
                <Icon size={19} weight={active ? "fill" : "regular"} className={active ? "text-signal" : undefined} aria-hidden />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
