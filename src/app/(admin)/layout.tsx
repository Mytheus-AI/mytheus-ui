import type { Metadata } from "next";
import { OrgProvider } from "@/lib/org-context";
import { resolveOrgContext } from "@/lib/api/org-context";
import { appFontClass } from "@/lib/fonts";
import { Toaster } from "@/components/ui/Toaster";
import "@/styles/app-theme.css";
import "@/styles/ops.css";

export const metadata: Metadata = {
  title: "Mytheus | Admin",
};

/* The platform-staff consoles. Clerk middleware already requires a session here; the org
   context is the signed-in user's own, from the verified session. The staff gate itself is in
   `ops/layout.tsx` (`GET /admin/ops/whoami`, deny by default); admin-ops-service enforces it
   again on every `/admin/ops/*` call.

   This layout is only the theme and type frame. The console's own frame (sidebar, sections,
   Sign out) is drawn by `ops/layout.tsx` after the gate passes, so someone who is not staff
   never sees what the console contains: they get a plain 404. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const orgContext = await resolveOrgContext();
  return (
    <OrgProvider value={orgContext ?? undefined}>
      <div suppressHydrationWarning className={`mx-app mx-ops ${appFontClass} min-h-dvh bg-bg`}>
        <a
          href="#admin-main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-ctl focus:bg-pill focus:px-4 focus:py-2.5 focus:text-[14px] focus:font-semibold focus:text-pill-on"
        >
          Skip to content
        </a>
        {children}
        <Toaster />
      </div>
    </OrgProvider>
  );
}
