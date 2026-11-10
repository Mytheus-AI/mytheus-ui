import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrgProvider } from "@/lib/org-context";
import { resolveOrgContext } from "@/lib/api/org-context";
import { appFontClass } from "@/lib/fonts";
import { THEME_INIT } from "@/components/app/theme-init";
import "@/styles/app-theme.css";
import "@/styles/meeting.css";

export const metadata: Metadata = { title: "Meeting | Mytheus" };

/**
 * The call surfaces (pre-join and the live room) are full screen, without the app sidebar. They
 * still need everything the app shell provides: an authenticated user (middleware already gates
 * this path; the redirect is belt and braces), the org context, the scoped theme with light/dark
 * set before first paint (`.mx-app`), and the meeting scope (`.mx-meet`).
 */
export default async function CallLayout({ children }: { children: React.ReactNode }) {
  const orgContext = await resolveOrgContext();
  if (!orgContext) redirect("/sign-in");

  return (
    <OrgProvider value={orgContext}>
      <div suppressHydrationWarning className={`mx-app mx-meet ${appFontClass} min-h-dvh bg-bg`}>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        {children}
      </div>
    </OrgProvider>
  );
}
