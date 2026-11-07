import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrgProvider } from "@/lib/org-context";
import { resolveOrgContext } from "@/lib/api/org-context";
import { AppShell } from "@/components/app/AppShell";
import "@/styles/app-theme.css";

export const metadata: Metadata = {
  title: "Mytheus — App",
};

/**
 * The authenticated shell, and the ONLY place org context is resolved.
 *
 * Auth is now wired: `src/middleware.ts` gates every route under `(app)` and `(admin)`, and
 * the context comes from the verified Clerk session rather than `mockOrgContext`. This closes
 * the `TODO(auth)` that stood here.
 *
 * The `redirect` is belt and braces with the middleware, not a duplicate of it. A layout that
 * assumed a session and dereferenced a null context would render a broken shell if the
 * matcher ever stopped covering a path; this turns that into a redirect.
 *
 * `org_id` is not resolved here and never reaches the browser. `api-gateway` derives it from
 * the JWT on every request; the client's job is to send the token and nothing else.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const orgContext = await resolveOrgContext();
  if (!orgContext) redirect("/sign-in");

  return (
    <OrgProvider value={orgContext}>
      <AppShell>{children}</AppShell>
    </OrgProvider>
  );
}
