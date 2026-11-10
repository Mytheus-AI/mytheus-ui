"use client";

import { Buildings, ChartLine, ClockCounterClockwise, Flag } from "@phosphor-icons/react";
import { TabNav } from "@/components/ui/TabNav";

/* Section tabs for the internal-ops console, the same TabNav the Workspace console uses. */

const TABS = [
  { href: "/ops", label: "Tenants", icon: Buildings },
  { href: "/ops/flags", label: "Feature flags", icon: Flag },
  { href: "/ops/costs", label: "Cost and lag", icon: ChartLine },
  { href: "/ops/audit", label: "Audit log", icon: ClockCounterClockwise },
];

export function OpsTabs() {
  return <TabNav items={TABS} label="Ops console sections" exact={["/ops"]} className="mb-6" />;
}
