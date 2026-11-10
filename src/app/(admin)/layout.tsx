import type { Metadata } from "next";
import Link from "next/link";
import { OrgProvider } from "@/lib/org-context";
import { resolveOrgContext } from "@/lib/api/org-context";
import { Badge } from "@/components/ui/Badge";
import { LogoMark } from "@/components/Logo";
import { appFontClass } from "@/lib/fonts";
import { THEME_INIT } from "@/components/app/theme-init";
import "@/styles/app-theme.css";

export const metadata: Metadata = {
  title: "Mytheus | Admin",
};

/* The platform-staff consoles. Clerk middleware already requires a session here; the org
   context is the signed-in user's own, from the verified session. The staff gate itself is in
   `ops/layout.tsx` (`GET /admin/ops/whoami`, deny by default); admin-ops-service enforces it
   again on every `/admin/ops/*` call. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const orgContext = await resolveOrgContext();
  return (
    <OrgProvider value={orgContext ?? undefined}>
      <div suppressHydrationWarning className={`mx-app ${appFontClass} min-h-dvh bg-bg`}>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <header className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line bg-surface px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <LogoMark size={22} />
            <span className="text-[18px] font-medium tracking-[-0.05em] text-ink">Mytheus</span>
            <Badge tone="warning">Admin console</Badge>
          </div>
          <Link
            href="/dashboard"
            className="whitespace-nowrap text-[13px] font-medium text-ink-3 transition-colors hover:text-ink-2"
          >
            Back to app
          </Link>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </OrgProvider>
  );
}
