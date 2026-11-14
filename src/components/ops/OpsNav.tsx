"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Buildings, ChartLine, ChatCircleText, ClockCounterClockwise, Flag, Gauge, Heartbeat, UsersThree, type Icon } from "@phosphor-icons/react";

/* The ops console's sections (ADR-0046), grouped by what staff come to do: watch the platform,
   change it, or look something up. A list beside the content from lg up; one sideways row under
   the header below that. Links, not tabs: each section is its own route and the current one
   carries aria-current. */

type Item = { href: string; label: string; icon: Icon };

export const OPS_GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "Platform",
    items: [
      { href: "/ops", label: "Overview", icon: Gauge },
      { href: "/ops/workspaces", label: "Workspaces", icon: Buildings },
      { href: "/ops/health", label: "Health", icon: Heartbeat },
      { href: "/ops/costs", label: "Cost and lag", icon: ChartLine },
    ],
  },
  {
    label: "Controls",
    items: [
      { href: "/ops/flags", label: "Feature flags", icon: Flag },
      { href: "/ops/staff", label: "Staff", icon: UsersThree },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "/ops/audit", label: "Audit log", icon: ClockCounterClockwise },
      { href: "/ops/feedback", label: "Feedback", icon: ChatCircleText },
    ],
  },
];

const ALL = OPS_GROUPS.flatMap((g) => g.items);

function useCurrent(): string | null {
  const pathname = usePathname() ?? "";
  return (
    ALL.filter((t) => pathname === t.href || (t.href !== "/ops" && pathname.startsWith(`${t.href}/`))).sort((a, b) => b.href.length - a.href.length)[0]
      ?.href ?? null
  );
}

function NavLink({ item, current, row = false }: { item: Item; current: boolean; row?: boolean }) {
  const I = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      className={`flex h-10 items-center gap-3 whitespace-nowrap rounded-ctl px-3 text-[14px] font-semibold transition-[background-color,color,transform] duration-150 motion-safe:active:scale-[0.98] ${
        row ? "px-3.5" : ""
      } ${current ? "bg-surface text-ink shadow-warm-1" : "text-ink-3 hover:bg-bg-2 hover:text-ink"}`}
    >
      <I size={19} weight={current ? "fill" : "regular"} className={current ? "text-signal" : undefined} aria-hidden />
      {item.label}
    </Link>
  );
}

/** The sidebar list, grouped. */
export function OpsSideNav() {
  const current = useCurrent();
  return (
    <nav aria-label="Ops console" className="flex flex-col gap-5">
      {OPS_GROUPS.map((g) => (
        <div key={g.label}>
          <p className="px-3 pb-1.5 text-[12.5px] font-semibold text-ink-3">{g.label}</p>
          <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {g.items.map((item) => (
              <li key={item.href}>
                <NavLink item={item} current={current === item.href} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** The same sections as one sideways row, for narrow screens. */
export function OpsRowNav() {
  const current = useCurrent();
  return (
    <nav aria-label="Ops console" className="min-w-0">
      <ul className="m-0 flex list-none gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
        {ALL.map((item) => (
          <li key={item.href} className="shrink-0">
            <NavLink item={item} current={current === item.href} row />
          </li>
        ))}
      </ul>
    </nav>
  );
}
