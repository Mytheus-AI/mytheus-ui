import { OrgProvider } from "../../src/lib/org-context";
import { Sidebar } from "../../src/components/app/Sidebar";
import { Topbar } from "../../src/components/app/Topbar";
import { ProfilePanel } from "../../src/components/settings/ProfilePanel";

/* The app frame with Settings > Profile in it: the sidebar's agent tab (a plush) beside the
   topbar's account avatar and the profile's face picker (both the person's ink doodle). */
export function ShellHarness({ theme = "light" }: { theme?: "light" | "dark" }) {
  return (
    <OrgProvider
      value={{
        org: { id: "org-1", name: "Yash" },
        user: { id: "u-samar", name: "Samar Rihan", email: "samar@example.com", role: "admin", avatarSeed: "abcd2345" },
      }}
    >
      <div className="mx-app bg-bg text-ink" data-theme={theme} style={{ display: "grid", gridTemplateColumns: "280px minmax(0,1fr)", minHeight: "100dvh" }}>
        <div style={{ position: "relative", height: "100dvh" }}>
          <Sidebar rail={false} inboxCount={3} agent={{ name: "Samar's Myte", seed: "agent:u-samar" }} onToggleRail={() => {}} />
        </div>
        <div style={{ minWidth: 0 }}>
          <Topbar onSearchClick={() => {}} />
          <main style={{ maxWidth: 820, padding: "24px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
            <ProfilePanel profile={null} />
          </main>
        </div>
      </div>
    </OrgProvider>
  );
}
