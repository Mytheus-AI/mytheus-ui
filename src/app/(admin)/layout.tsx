import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { OrgProvider } from "@/lib/org-context";
import { resolveOrgContext } from "@/lib/api/org-context";
import { Wordmark } from "@/components/site/Wordmark";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { appFontClass } from "@/lib/fonts";
import { THEME_INIT } from "@/components/app/theme-init";
import "@/styles/app-theme.css";

export const metadata: Metadata = {
  title: "Mytheus | Admin",
};

/* The platform-staff consoles. Clerk middleware already requires a session here; the org
   context is the signed-in user's own, from the verified session. There is no staff role yet,
   so the pages under this layout show no cross-tenant data at all (see
   `PlatformConsoleUnavailable`); the real gate lands with that role and `admin-ops-service`.

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
            href="/admin"
            className="group inline-flex min-h-10 shrink-0 items-center focus-visible:!rounded-ctl"
            aria-label="Mytheus admin console"
          >
            <Wordmark size={22} textClassName="text-[19px] sm:text-[21px]" />
          </Link>
          <span className="inline-flex shrink-0 items-center rounded-full bg-signal-soft px-2.5 py-[3px] text-[12.5px] font-semibold text-signal-ink">
            Admin console
          </span>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-ctl border border-line-2 bg-surface px-3 text-[14px] font-semibold text-ink transition-colors duration-150 hover:bg-surface-2 focus-visible:!rounded-ctl sm:px-3.5"
            >
              <ArrowLeft size={16} aria-hidden />
              <span className="hidden min-[420px]:inline">Back to app</span>
              <span className="sr-only min-[420px]:hidden">Back to app</span>
            </Link>
          </div>
        </header>
        <main id="admin-main" className="px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </OrgProvider>
  );
}
