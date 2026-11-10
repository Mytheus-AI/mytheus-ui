import { Page, PageHead } from "@/components/ui/Page";
import { SectionTabs } from "@/components/app/SectionTabs";

/* My work: everything you owe in one view, with three tabs (Tasks, Promises, Updates I owe). The
   one h1 is here; each tab opens with its own line of context and action (`SectionBar`). */
export default function WorkLayout({ children }: { children: React.ReactNode }) {
  return (
    <Page>
      <PageHead title="My work" context="Tasks you own, promises you made, and the updates you owe before your next meetings." />
      <SectionTabs section="work" label="My work sections" className="mb-6" />
      {children}
    </Page>
  );
}
