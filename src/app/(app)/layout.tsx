import type { Metadata } from "next";
import { OrgProvider } from "@/lib/org-context";
import { mockOrgContext } from "@/lib/mock/data";
import { Sidebar } from "@/components/app/Sidebar";
import { Topbar } from "@/components/app/Topbar";

export const metadata: Metadata = {
  title: "Mytheus — App",
};

/* Auth isn't wired up yet (no Clerk keys) — these routes are reachable
   without a session. When Clerk lands, resolve the real org/user here from
   the session JWT and gate with middleware instead of leaving this open. */
// TODO(auth): restore Clerk middleware + gate (app) here; mockOrgContext → session-derived OrgContext.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrgProvider value={mockOrgContext}>
      <div className="flex min-h-dvh bg-bg">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
        </div>
      </div>
    </OrgProvider>
  );
}
