"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOrgContext } from "@/lib/org-context";
import { Avatar } from "@/components/ui/Avatar";
import { LogoMark } from "@/components/Logo";

/* The app nav, sectioned to match the doc-20 screen inventory: Workspace
   (dashboard, meetings, decisions, tasks), Organization (org chart, search),
   Account (settings, billing), plus the admin consoles for admins. */

const SECTIONS: {
  label: string | null;
  items: { href: string; label: string }[];
}[] = [
  {
    label: null,
    items: [{ href: "/dashboard", label: "Dashboard" }],
  },
  {
    label: "Workspace",
    items: [
      { href: "/meetings", label: "Meetings" },
      { href: "/decisions", label: "Decisions" },
      { href: "/tasks", label: "Tasks" },
    ],
  },
  {
    label: "Organization",
    items: [
      { href: "/org", label: "Org chart" },
      { href: "/search", label: "Search" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/settings", label: "Settings" },
      { href: "/billing", label: "Billing" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { org, user } = useOrgContext();

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(`${href}/`);

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

      <nav className="mt-7 flex flex-1 flex-col gap-5 overflow-y-auto">
        {SECTIONS.map((section) => (
          <div key={section.label ?? "root"}>
            {section.label && (
              <p className="mb-1.5 px-3 font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-3">
                {section.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`rounded-md px-3 py-2 text-[14px] font-medium transition-colors duration-200 ${
                    isActive(item.href)
                      ? "bg-bg-2 text-ink"
                      : "text-ink-2 hover:bg-bg-2 hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}

        {user.role === "admin" ? (
          <div>
            <p className="mb-1.5 px-3 font-mono text-[9.5px] uppercase tracking-[0.2em] text-ink-3">
              Admin
            </p>
            <div className="flex flex-col gap-0.5">
              {[
                { href: "/admin", label: "Admin console" },
                { href: "/ops", label: "Ops console" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`rounded-md border border-dashed border-line px-3 py-2 text-[13px] font-medium transition-colors duration-200 ${
                    isActive(item.href)
                      ? "bg-bg-2 text-ink"
                      : "text-ink-3 hover:bg-bg-2 hover:text-ink-2"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
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
