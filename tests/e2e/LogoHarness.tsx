import { OrgProvider } from "../../src/lib/org-context";
import { OrgLogoCard } from "../../src/components/tenant/OrgLogoCard";
import { Sidebar } from "../../src/components/app/Sidebar";
import { ChooseOrganization } from "../../src/components/auth/ChooseOrganization";

type Theme = "light" | "dark";

const ctx = (role: "admin" | "member", logoUrl?: string) => ({
  org: { id: "org-kestrel", name: "Kestrel Labs", logoUrl },
  user: { id: "u-priya", name: "Priya Raman", email: "priya@kestrel.test", role },
});

/** The logo editor on its own, in a column the width of the Workspace overview's left half. */
export function LogoEditorHarness({ theme = "light", role = "admin", logoUrl }: { theme?: Theme; role?: "admin" | "member"; logoUrl?: string }) {
  return (
    <OrgProvider value={ctx(role, logoUrl)}>
      <div className="mx-app min-h-screen bg-bg p-6 text-ink" data-theme={theme}>
        <div style={{ maxWidth: 640 }}>
          <OrgLogoCard />
        </div>
      </div>
    </OrgProvider>
  );
}

/** The sidebar with the workspace's logo in the switcher, open or collapsed to the rail. */
export function LogoSidebarHarness({ theme = "light", rail = false, logoUrl }: { theme?: Theme; rail?: boolean; logoUrl?: string }) {
  return (
    <OrgProvider value={ctx("admin", logoUrl)}>
      <div className="mx-app bg-bg" style={{ position: "relative", height: 900, width: 320 }} data-theme={theme}>
        <Sidebar rail={rail} inboxCount={3} agent={{ name: "Priya's Myte", seed: "agent:u-priya" }} onToggleRail={() => {}} />
      </div>
    </OrgProvider>
  );
}

/** The workspace chooser (`/onboarding/organization`), its memberships from the Clerk stub. */
export function ChooserHarness({ theme = "light" }: { theme?: Theme }) {
  return (
    <div className="mx-auth min-h-screen" data-theme={theme}>
      <ChooseOrganization />
    </div>
  );
}
