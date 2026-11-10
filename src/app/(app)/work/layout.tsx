import { Page, PageHead } from "@/components/ui/Page";
import { TabNav } from "@/components/ui/TabNav";
import { WORK_TABS } from "@/components/app/nav";

/* My work: everything you owe in one view, with three tabs (Tasks, Promises, Updates I owe). The
   one h1 is here; each tab opens with its own line of context and action (`SectionBar`). */
export default function WorkLayout({ children }: { children: React.ReactNode }) {
  return (
    <Page>
      <PageHead title="My work" context="Tasks you own, promises you made, and the updates you owe before your next meetings." />
      <TabNav items={WORK_TABS.map(({ href, label, icon }) => ({ href, label, icon }))} label="My work sections" className="mb-6" />
      {children}
    </Page>
  );
}
