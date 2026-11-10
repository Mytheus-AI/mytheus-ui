import type { ReactNode } from "react";

/* Kept for older pages: the nav, line and footer now come from `app/(marketing)/layout.tsx`,
   so this renders its children unchanged. New pages should not use it. */
export function PageShell({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
