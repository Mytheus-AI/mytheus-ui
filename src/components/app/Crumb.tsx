"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { rememberRecent } from "@/lib/recent";

/* The topbar breadcrumb's last step. A detail page knows its own title (a decision's wording, a
   person's name) and the shell's topbar does not, so the page hands it over with `<Crumb>`; the
   topbar derives the steps before it from the path. Top-level pages render no crumb and the
   topbar shows no title at all (the page's own h1 is the only title). */

type CrumbState = { label: string | null; set: (label: string | null) => void };

const CrumbContext = createContext<CrumbState>({ label: null, set: () => {} });

export function CrumbProvider({ children }: { children: ReactNode }) {
  const [label, set] = useState<string | null>(null);
  return <CrumbContext.Provider value={{ label, set }}>{children}</CrumbContext.Provider>;
}

export function useCrumbLabel() {
  return useContext(CrumbContext).label;
}

/** Render on a detail page to name it in the topbar breadcrumb (and the palette's recent
    items, with `hint` as its second line). Renders nothing itself. */
export function Crumb({ label, hint, icon }: { label: string; hint?: string; icon?: string }) {
  const { set } = useContext(CrumbContext);
  const pathname = usePathname();
  useEffect(() => {
    set(label);
    return () => set(null);
  }, [label, set]);
  useEffect(() => {
    if (pathname) rememberRecent({ label, href: pathname, hint, icon });
  }, [label, hint, icon, pathname]);
  return null;
}
