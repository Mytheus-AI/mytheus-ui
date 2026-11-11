import type { ReactNode } from "react";
import { OrgProvider } from "../../../src/lib/org-context";
import { ORG } from "./fixtures";

/* The app shell as a page sees it, for skeleton and page pairs: the `.mx-app` theme root (light or
   dark), the 252px sidebar from lg up, and `<main>` with the shell's own gutters (AppShell.tsx).
   `meet` adds the `.mx-meet` scope the Meetings layout puts around its pages; `bare` drops the
   shell for the full-screen frames (onboarding, the call). */
export type Theme = "light" | "dark";

export function Shell({ theme = "light", meet = false, bare = false, children }: { theme?: Theme; meet?: boolean; bare?: boolean; children: ReactNode }) {
  const body = meet ? <div className="mx-meet">{children}</div> : children;
  if (bare) {
    return (
      <div className="mx-app bg-bg" data-theme={theme}>
        <OrgProvider value={ORG}>
          <div data-skel-root>{body}</div>
        </OrgProvider>
      </div>
    );
  }
  return (
    <div className="mx-app flex min-h-dvh bg-bg" data-theme={theme}>
      <div className="hidden w-[252px] shrink-0 lg:block" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-14 shrink-0" />
        <OrgProvider value={ORG}>
          <main data-skel-root className="flex-1 overflow-x-hidden px-4 pb-12 pt-1 sm:px-6 lg:px-8">
            {body}
          </main>
        </OrgProvider>
      </div>
    </div>
  );
}
