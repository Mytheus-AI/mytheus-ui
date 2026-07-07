"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/* Sub-nav shared by every settings screen. Billing lives at its own top-level
   route but belongs to this cluster, so it appears here too. */

const TABS = [
  { href: "/settings", label: "Workspace" },
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/integrations", label: "Integrations" },
  { href: "/billing", label: "Billing" },
] as const;

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Settings sections" className="flex flex-wrap gap-1.5">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-[40px] items-center rounded-pill px-4 text-[13.5px] font-medium transition-colors duration-150 ${
              active
                ? "bg-pill text-white"
                : "border border-line bg-surface text-ink-2 hover:border-line-2 hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
