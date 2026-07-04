import type { Metadata } from "next";
import { OrgProvider } from "@/lib/org-context";
import { mockOrgContext } from "@/lib/mock/data";
import { AppShell } from "@/components/app/AppShell";

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
      <AppShell>{children}</AppShell>
    </OrgProvider>
  );
}
