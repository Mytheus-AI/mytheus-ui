"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOrgContext } from "@/lib/org-context";
import { Avatar } from "@/components/ui/Avatar";
import { LogoMark } from "@/components/Logo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/meetings", label: "Meetings" },
  { href: "/search", label: "Search" },
  { href: "/settings", label: "Settings" },
  { href: "/billing", label: "Billing" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { org, user } = useOrgContext();

  return (
    <aside className="flex h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-2 text-[22px] font-medium tracking-[-0.05em] text-ink"
      >
        <LogoMark size={24} />
        Mytheus
      </Link>

      <p className="mt-1 truncate px-2 text-[12px] text-ink-3">{org.name}</p>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-[14px] font-medium transition-colors duration-200 ${
                active ? "bg-bg-2 text-ink" : "text-ink-2 hover:bg-bg-2 hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}

        {user.role === "admin" ? (
          <Link
            href="/admin"
            className={`mt-4 rounded-md border border-dashed border-line px-3 py-2 text-[13px] font-medium transition-colors duration-200 ${
              pathname?.startsWith("/admin")
                ? "bg-bg-2 text-ink"
                : "text-ink-3 hover:bg-bg-2 hover:text-ink-2"
            }`}
          >
            Admin console
          </Link>
        ) : null}
      </nav>

      <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
        <Avatar name={user.name} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-ink-2">{user.name}</p>
          <p className="truncate text-[11px] text-ink-3">{user.email}</p>
        </div>
      </div>
    </aside>
  );
}
