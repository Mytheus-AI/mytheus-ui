"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Buildings, CreditCard, PlugsConnected, UserCircle } from "@phosphor-icons/react";

/* Section nav shared by every settings screen: a vertical list from lg up, a horizontal
   scroller below. Billing lives at its own top-level route but belongs to this cluster, so it
   appears here too. */

const TABS = [
  { href: "/settings", label: "Workspace", icon: Buildings },
  { href: "/settings/profile", label: "Profile", icon: UserCircle },
  { href: "/settings/integrations", label: "Integrations", icon: PlugsConnected },
  { href: "/billing", label: "Billing", icon: CreditCard },
] as const;

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings sections"
      className="-mx-4 flex gap-1.5 overflow-x-auto px-4 py-1 sm:-mx-6 sm:px-6 lg:sticky lg:top-0 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:py-0"
    >
      {TABS.map((t) => {
        const active = pathname === t.href;
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex h-10 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-pill border px-3.5 text-[14px] font-semibold transition-colors duration-150 focus-visible:!rounded-pill active:bg-bg-3 lg:h-11 lg:gap-3 lg:text-[14.5px] ${
              active
                ? "border-line bg-surface text-ink shadow-sm"
                : "border-transparent text-ink-3 hover:bg-bg-2 hover:text-ink"
            }`}
          >
            <Icon
              size={19}
              weight={active ? "fill" : "regular"}
              className={active ? "text-signal-deep" : undefined}
              aria-hidden="true"
            />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
