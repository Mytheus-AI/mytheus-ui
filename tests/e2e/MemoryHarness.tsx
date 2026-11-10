import { OrgProvider } from "../../src/lib/org-context";
import { Toaster } from "../../src/components/ui/Toaster";
import { MemoryPanel } from "../../src/components/settings/MemoryPanel";
import { ErasureStores } from "../../src/components/tenant/ErasureStores";
import { EMPTY_MEMORY, MEMORY_FIXTURE } from "./memory-fixture";

/* Wave 3 surfaces as the app shell renders them: Settings > Agent memory (the panel, inside the
   settings column width) and one erasure's per-store checklist from Workspace > Data and privacy.
   Server reads are replaced by props; the server actions by stubs/actions.ts. */

export function MemoryHarness({ theme = "light", empty = false }: { theme?: "light" | "dark"; empty?: boolean }) {
  return (
    <OrgProvider value={{ org: { id: "org-1", name: "Acme" }, user: { id: "u-maya", name: "Maya Chen", email: "maya@example.com", role: "admin" } }}>
      <div className="mx-app min-h-dvh bg-bg p-4 sm:p-8" data-theme={theme}>
        <main className="mx-auto grid max-w-[1200px] gap-6 lg:grid-cols-[minmax(0,880px)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-5">
            <h1 className="display text-[30px] text-ink-display">Settings</h1>
            <h2 className="display text-[24px] text-ink-display">What your agent remembers</h2>
            <MemoryPanel initial={empty ? EMPTY_MEMORY : MEMORY_FIXTURE} />
          </div>
          <aside className="min-w-0 rounded-card border border-line bg-surface p-5">
            <h2 className="mb-3 text-[17px] font-semibold text-ink">Erasure progress</h2>
            <ErasureStores
              id="erasure-1"
              status="in_progress"
              stores={[
                { store: "core_api", status: "completed", completed_at: "2026-11-11T10:00:00Z", counts: { notes: 3 } },
                { store: "transcript_chunks", status: "completed", completed_at: "2026-11-11T10:00:04Z" },
                { store: "vectors", status: "pending" },
                { store: "search_index", status: "pending" },
                { store: "knowledge_graph", status: "pending" },
              ]}
            />
          </aside>
        </main>
      </div>
      <Toaster />
    </OrgProvider>
  );
}
