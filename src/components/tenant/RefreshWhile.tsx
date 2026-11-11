"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* Re-reads the page's server data every `everyMs` while `active` (an erasure still waiting on a
   store), and stops once nothing is waiting or the tab is hidden. Renders nothing. */
export function RefreshWhile({ active, everyMs = 10_000 }: { active: boolean; everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, everyMs);
    return () => window.clearInterval(t);
  }, [active, everyMs, router]);
  return null;
}
