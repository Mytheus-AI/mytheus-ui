"use client";

import { Buildings, ChartLine, ClockCounterClockwise, Flag, Gauge, Heartbeat, UsersThree } from "@phosphor-icons/react";
import { TabNav } from "@/components/ui/TabNav";

/* Section tabs for the superadmin console (ADR-0046), the same TabNav the Workspace console uses. */

const TABS = [
  { href: "/ops", label: "Overview", icon: Gauge },
  { href: "/ops/workspaces", label: "Workspaces", icon: Buildings },
  { href: "/ops/flags", label: "Feature flags", icon: Flag },
  { href: "/ops/costs", label: "Cost and lag", icon: ChartLine },
  { href: "/ops/health", label: "Health", icon: Heartbeat },
  { href: "/ops/audit", label: "Audit log", icon: ClockCounterClockwise },
  { href: "/ops/staff", label: "Staff", icon: UsersThree },
];

export function OpsTabs() {
  return <TabNav items={TABS} label="Ops console sections" exact={["/ops"]} className="mb-6" />;
}
