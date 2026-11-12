import { OrgProvider } from "../../src/lib/org-context";
import { Toaster } from "../../src/components/ui/Toaster";
import { SectionBar } from "../../src/components/ui/Page";
import { IntegrationsPanel } from "../../src/components/settings/IntegrationsPanel";
import IntegrationsLoading from "../../src/app/(app)/settings/integrations/loading";
import type { IntegrationsLoad } from "../../src/lib/api/integrations";
import { MIXED, NOTHING_CONFIGURED, OTHER_TRACKER, PEOPLE } from "./integrations-fixture";

/* Settings > Integrations as the settings layout frames it (title row, section list beside the
   panel from lg), with the page's server reads replaced by fixed data. */

export type IntegrationsScenario = "nothing" | "mixed" | "other-tracker" | "unavailable" | "member" | "loading";

function loadFor(s: IntegrationsScenario): IntegrationsLoad {
  if (s === "unavailable") return { kind: "unavailable" };
  if (s === "member") return { kind: "forbidden" };
  if (s === "mixed") return { kind: "live", items: MIXED };
  if (s === "other-tracker") return { kind: "live", items: OTHER_TRACKER };
  return { kind: "live", items: NOTHING_CONFIGURED };
}

export function IntegrationsHarness({ theme = "light", scenario = "nothing" }: { theme?: "light" | "dark"; scenario?: IntegrationsScenario }) {
  const admin = scenario !== "member";
  return (
    <OrgProvider value={{ org: { id: "org-1", name: "Acme" }, user: { id: "u-maya", name: "Maya Chen", email: "maya@acme.com", role: admin ? "admin" : "member" } }}>
      <div className="mx-app min-h-dvh bg-bg text-ink" data-theme={theme}>
        <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-8 sm:py-8">
          <h1 className="display text-[clamp(28px,3vw,34px)] text-ink-display">Settings</h1>
          <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,880px)] lg:items-start lg:gap-10">
            <nav aria-label="Settings sections" className="hidden text-[15px] text-ink-3 lg:block">
              <p className="py-2">Profile</p>
              <p className="py-2">Notifications</p>
              <p className="py-2 font-semibold text-ink">Integrations</p>
              <p className="py-2">API access</p>
            </nav>
            <div className="min-w-0">
              {scenario === "loading" ? (
                <IntegrationsLoading />
              ) : (
                <>
                  <SectionBar title="Integrations" context="The tools your Mytes work with, and where the workspace shares what it confirms." />
                  <div className="grid gap-6">
                    <IntegrationsPanel
                      load={loadFor(scenario)}
                      banner={null}
                      people={PEOPLE}
                      canManage={admin}
                      appOrigin="https://dashboard.mytheus.cloud"
                      apiOrigin="https://api.mytheus.cloud"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
        <Toaster />
      </div>
    </OrgProvider>
  );
}
