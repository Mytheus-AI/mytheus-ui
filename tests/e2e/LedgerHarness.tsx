import { OrgProvider } from "../../src/lib/org-context";
import { Toaster } from "../../src/components/ui/Toaster";
import { PromiseLedger } from "../../src/components/promises/ledger/PromiseLedger";
import { Page, PageHead } from "../../src/components/ui/Page";
import type { MemberOption } from "../../src/components/ui/MemberPicker";
import { CAPACITY, EMPTY_LEDGER, INCOMING, LEDGER, TODAY } from "./ledger-fixture";

/* My work > Promise ledger as the app shell renders it (the My work title above the tab). Server
   reads are replaced by props; the server actions by stubs/actions.ts. */

const MEMBERS: MemberOption[] = [
  { id: "u-maya", name: "Maya Chen", email: "maya@example.com", imageUrl: null, isYou: true },
  { id: "u-raj", name: "Raj Patel", email: "raj@example.com", imageUrl: null, isYou: false },
  { id: "u-priya", name: "Priya Shah", email: "priya@example.com", imageUrl: null, isYou: false },
];

export function LedgerHarness({
  theme = "light",
  empty = false,
  offer = false,
}: {
  theme?: "light" | "dark";
  empty?: boolean;
  offer?: boolean;
}) {
  const first = LEDGER.items[0];
  return (
    <OrgProvider value={{ org: { id: "org-1", name: "Acme" }, user: { id: "u-maya", name: "Maya Chen", email: "maya@example.com", role: "member" } }}>
      <div className="mx-app min-h-dvh bg-bg px-4 py-6 sm:px-8" data-theme={theme}>
        <main>
          <Page>
            <PageHead title="My work" context="Tasks you own, promises you made, and the updates you owe before your next meetings." />
            <PromiseLedger
              initial={empty ? EMPTY_LEDGER : LEDGER}
              initialCapacity={CAPACITY}
              incoming={empty ? [] : INCOMING}
              members={MEMBERS}
              slack="connected"
              serverToday={TODAY}
              focus={offer ? { offer: { kind: "commitment", id: first.id, content: "", due: null, askName: null, suggested: null } } : {}}
            />
          </Page>
        </main>
      </div>
      <Toaster />
    </OrgProvider>
  );
}
