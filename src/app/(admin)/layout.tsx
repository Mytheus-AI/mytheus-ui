import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/ssr";
import { OrgProvider } from "@/lib/org-context";
import { resolveOrgContext } from "@/lib/api/org-context";
import { Wordmark } from "@/components/site/Wordmark";
import { buttonClass } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { appFontClass } from "@/lib/fonts";
import { THEME_INIT } from "@/components/app/theme-init";
import { Toaster } from "@/components/ui/Toaster";
import "@/styles/app-theme.css";

export const metadata: Metadata = {
  title: "Mytheus | Admin",
};

/* The platform-staff consoles. Clerk middleware already requires a session here; the org
   context is the signed-in user's own, from the verified session. The staff gate itself is in
   `ops/layout.tsx` (`GET /admin/ops/whoami`, deny by default); admin-ops-service enforces it
   again on every `/admin/ops/*` call.

   No sidebar: a 64px header in the app shell's rhythm (same height, gutters and theme toggle)
   with the wordmark, an "Admin console" chip so it is never mistaken for the workspace, and the
   way back. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const orgContext = await resolveOrgContext();
  return (
    <OrgProvider value={orgContext ?? undefined}>
      <div suppressHydrationWarning className={`mx-app ${appFontClass} min-h-dvh bg-bg`}>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <a
          href="#admin-main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-ctl focus:bg-pill focus:px-4 focus:py-2.5 focus:text-[14px] focus:font-semibold focus:text-pill-on"
        >
          Skip to content
        </a>
        <header className="flex h-16 items-center gap-2 border-b border-line bg-bg px-4 sm:px-6 lg:px-8">
          <Link
            href="/ops"
            className="group inline-flex min-h-10 shrink-0 items-center rounded-ctl"
            aria-label="Mytheus admin console"
          >
            <Wordmark size={22} textClassName="text-[17px] sm:text-[17px]" />
          </Link>
          <Chip tone="accent" className="shrink-0">
            Admin console
          </Chip>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Link href="/dashboard" className={buttonClass({ variant: "outline", size: "sm" })}>
              <ArrowLeft size={16} aria-hidden />
              <span className="hidden min-[420px]:inline">Back to app</span>
              <span className="sr-only min-[420px]:hidden">Back to app</span>
            </Link>
          </div>
        </header>
        <main id="admin-main" className="px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>
        <Toaster />
      </div>
    </OrgProvider>
  );
}
