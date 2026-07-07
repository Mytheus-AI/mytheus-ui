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

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const { org } = useOrgContext();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open navigation"
            className="-ml-1 grid h-10 w-10 shrink-0 place-items-center rounded-md text-ink-2 transition-colors duration-200 hover:bg-bg-2 hover:text-ink lg:hidden"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden>
              <path
                d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
        <h1 className="truncate text-[16px] font-medium tracking-tight text-ink-display">
          {titleFor(pathname)}
        </h1>
      </div>
      <Badge tone="default" className="shrink-0 whitespace-nowrap capitalize">
        {org.plan} plan
      </Badge>
    </header>
  );
}
