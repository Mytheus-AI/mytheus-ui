"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Buildings, CreditCard, PlugsConnected, UserCircle } from "@phosphor-icons/react";

/* Section nav shared by every settings screen: a vertical list from lg up (sticky beside the
   panel), a horizontal scroller below. Billing lives at its own top-level route but belongs to
   this cluster, so it appears here too. Plain links in reading order, so Tab walks them and the
   current one carries aria-current. */

const TABS = [
  { href: "/settings", label: "Workspace", icon: Buildings },
  { href: "/settings/profile", label: "Profile", icon: UserCircle },
  { href: "/settings/integrations", label: "Integrations", icon: PlugsConnected },
  { href: "/billing", label: "Billing", icon: CreditCard },
] as const;

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings sections" className="-mx-4 min-w-0 sm:-mx-6 lg:sticky lg:top-4 lg:mx-0">
      <ul className="flex gap-1.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:px-6 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:py-0 [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const active = pathname === t.href;
          const Icon = t.icon;
          return (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 items-center gap-2.5 whitespace-nowrap rounded-ctl border px-3.5 text-[14.5px] font-semibold transition-[background-color,color,border-color,transform] duration-150 focus-visible:!rounded-ctl active:scale-[0.98] motion-reduce:active:scale-100 lg:h-11 lg:gap-3 ${
                  active
                    ? "border-line bg-surface text-ink shadow-warm-1"
                    : "border-transparent text-ink-3 hover:bg-bg-2 hover:text-ink"
                }`}
              >
                <Icon
                  size={20}
                  weight={active ? "fill" : "regular"}
                  className={active ? "text-signal" : undefined}
                  aria-hidden="true"
                />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
