import { Page, PageHead } from "@/components/ui/Page";
import { SectionTabs } from "@/components/app/SectionTabs";

/* Settings: personal only (Profile, Notifications, Agent memory, Integrations, API access, Appearance). Workspace-wide
   settings, the plan and billing live in the Workspace console. The section list sits beside the
   panel from lg up (above it below lg); panels are held to the reading width. Headings run h1
   (Settings), h2 (the panel), h3 (each card). */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <Page>
      <PageHead title="Settings" context="How you appear, what reaches you, what your Myte remembers, the tools it connects to, and how Mytheus looks. Only you see these." />
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,880px)] lg:items-start lg:gap-10">
        <SectionTabs section="settings" label="Settings sections" orientation="vertical" />
        <div className="min-w-0">{children}</div>
      </div>
    </Page>
  );
}
