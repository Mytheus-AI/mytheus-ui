"use client";

import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { useOrgContext } from "@/lib/org-context";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/meetings": "Meetings",
  "/decisions": "Decisions",
  "/tasks": "Tasks",
  "/org": "Org chart",
  "/search": "Search",
  "/settings": "Settings",
  "/billing": "Billing",
};

function titleFor(pathname: string | null) {
  if (!pathname) return "";
  if (TITLES[pathname]) return TITLES[pathname];
  if (/^\/meetings\/[^/]+\/room$/.test(pathname)) return "Meeting room";
  if (/^\/meetings\/[^/]+\/transcript$/.test(pathname)) return "Transcript";
  if (/^\/meetings\/[^/]+$/.test(pathname)) return "Meeting";
  const root = "/" + (pathname.split("/")[1] ?? "");
  return TITLES[root] ?? "";
}

export function Topbar() {
  const pathname = usePathname();
  const { org } = useOrgContext();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface px-6">
      <h1 className="text-[16px] font-medium tracking-tight text-ink-display">
        {titleFor(pathname)}
      </h1>
      <Badge tone="default" className="capitalize">
        {org.plan} plan
      </Badge>
    </header>
  );
}
