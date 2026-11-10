import { OrgProvider } from "../../src/lib/org-context";
import { Toaster } from "../../src/components/ui/Toaster";
import { ApiTokensPanel } from "../../src/components/settings/ApiTokensPanel";
import { ConnectToolsPanel } from "../../src/components/settings/ConnectToolsPanel";
import { DecisionReach } from "../../src/components/decisions/DecisionReach";
import { ErasureFlow } from "../../src/components/tenant/ErasureFlow";

/* The Phase 4 reach surfaces as the app shell renders them: the `.mx-app` root with the theme,
   the org context (an admin), and fixed data. Server reads are replaced by props; the server
   actions by the canned answers in stubs/actions.ts. */

const tokens = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Claude Desktop",
    scope: "read" as const,
    state: "active" as const,
    token_preview: "mytheus_pat_...9f2c",
    created_at: "2026-10-02T10:00:00Z",
    expires_at: "2026-11-14T10:00:00Z",
    last_used_at: "2026-11-10T16:20:00Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Weekly report script",
    scope: "read_write" as const,
    state: "revoked" as const,
    token_preview: "mytheus_pat_...71ab",
    created_at: "2026-08-12T10:00:00Z",
    expires_at: "2026-11-10T10:00:00Z",
    revoked_at: "2026-09-01T10:00:00Z",
  },
];

const members = [
  { id: "u-maya", name: "Maya Chen", email: "maya@example.com", imageUrl: null, isYou: true },
  { id: "55555555-5555-4555-8555-555555555555", name: "Priya Nair", email: "priya@example.com", imageUrl: null, isYou: false },
  { id: "66666666-6666-4666-8666-666666666666", name: "Raj Patel", email: "raj@example.com", imageUrl: null, isYou: false },
];

const meetings = [
  { id: "77777777-7777-4777-8777-777777777777", title: "Pricing review", when: "Nov 3, 2026", live: false },
  { id: "88888888-8888-4888-8888-888888888888", title: null, when: "Nov 9, 2026", live: false },
];

export function ReachHarness({ theme = "light", empty = false }: { theme?: "light" | "dark"; empty?: boolean }) {
  return (
    <OrgProvider value={{ org: { id: "org-1", name: "Acme" }, user: { id: "u-maya", name: "Maya Chen", email: "maya@example.com", role: "admin" } }}>
      <div className="mx-app min-h-dvh bg-bg p-4 sm:p-8" data-theme={theme}>
        <main className="mx-auto grid max-w-[1200px] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-5">
            <h1 className="display text-[30px] text-ink-display">Reach</h1>
            <ApiTokensPanel initial={empty ? [] : tokens} nowIso="2026-11-11T10:00:00Z" />
            <ConnectToolsPanel origin="https://api.mytheus.cloud" />
            <div className="flex items-center justify-between rounded-card border border-line bg-surface p-5">
              <h2 className="text-[17px] font-semibold text-ink">Erase data</h2>
              <ErasureFlow members={members} meetings={meetings} />
            </div>
          </div>
          <aside className="min-w-0">
            <DecisionReach
              decisionId="99999999-9999-4999-8999-999999999999"
              meetingId="77777777-7777-4777-8777-777777777777"
              destinations={{
                notion: { kind: "live", configured: true, connected: true, destinations: [{ id: "abc123", name: "Decisions", kind: "page" }], note: "Only pages shared with the Mytheus integration appear here." },
                confluence: { kind: "live", configured: false, connected: false, destinations: [], note: null },
                slack: { kind: "live", configured: true, connected: false, destinations: [], note: null },
              }}
              exports={[{ provider: "notion", external_url: "https://www.notion.so/x", exported_at: "2026-11-05T10:00:00Z" }]}
              links={[
                {
                  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                  url: "https://app.mytheus.cloud/s/abc",
                  state: "active",
                  created_by_name: "Maya Chen",
                  created_at: "2026-11-05T10:00:00Z",
                  expires_at: "2026-12-05T10:00:00Z",
                  view_count: 4,
                  can_revoke: true,
                },
              ]}
              shareable
              isAdmin
            />
          </aside>
        </main>
      </div>
      <Toaster />
    </OrgProvider>
  );
}
