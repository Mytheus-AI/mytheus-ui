import { OrgProvider } from "../../src/lib/org-context";
import { Sidebar } from "../../src/components/app/Sidebar";

/** The app sidebar on its own, collapsed to the rail or open, for alignment and a11y checks. */
export function SidebarHarness({ rail = true, theme = "light" }: { rail?: boolean; theme?: "light" | "dark" }) {
  return (
    <OrgProvider
      value={{
        org: { id: "org-1", name: "Yash" },
        user: { id: "u-samar", name: "Samar Rihan", email: "samar@example.com", role: "admin" },
      }}
    >
      <div className="mx-app bg-bg" style={{ position: "relative", height: 900, width: 320 }} data-theme={theme}>
        <Sidebar rail={rail} inboxCount={3} agent={{ name: "Samar's agent", seed: "agent:u-samar" }} onToggleRail={() => {}} />
      </div>
    </OrgProvider>
  );
}
