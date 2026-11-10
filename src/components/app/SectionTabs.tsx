"use client";

import { TabNav } from "@/components/ui/TabNav";
import { SETTINGS_TABS, WORK_TABS, WORKSPACE_TABS } from "@/components/app/nav";

/* The section tabs of My work, Workspace and Settings. The lists hold icon components, which a
   server layout cannot hand to a client component, so the layouts name the section and this
   client wrapper looks the list up itself. */

const SECTIONS = { work: WORK_TABS, workspace: WORKSPACE_TABS, settings: SETTINGS_TABS } as const;

export function SectionTabs({
  section,
  ...rest
}: {
  section: keyof typeof SECTIONS;
  label: string;
  orientation?: "horizontal" | "vertical";
  exact?: string[];
  className?: string;
}) {
  return <TabNav items={SECTIONS[section].map(({ href, label, icon }) => ({ href, label, icon }))} {...rest} />;
}
