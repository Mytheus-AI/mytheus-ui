"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { rememberRecent } from "@/lib/recent";

/* The topbar breadcrumb's named steps. A detail page knows its own title (a decision's wording, a
   person's name) and the shell's topbar does not, so the page hands it over with `<Crumb>`; the
   topbar derives the steps before it from the path. A layout over several detail pages (a
   meeting's transcript, catch-up, decisions) names the step they share with
   `<Crumb level="parent">`, so the trail reads Meetings, Weekly sync, Transcript. Top-level pages
   render no crumb and the topbar shows no title at all (the page's own h1 is the only title). */

type CrumbState = {
  label: string | null;
  parent: string | null;
  set: (label: string | null) => void;
  setParent: (label: string | null) => void;
};

const CrumbContext = createContext<CrumbState>({ label: null, parent: null, set: () => {}, setParent: () => {} });

export function CrumbProvider({ children }: { children: ReactNode }) {
  const [label, set] = useState<string | null>(null);
  const [parent, setParent] = useState<string | null>(null);
  return <CrumbContext.Provider value={{ label, parent, set, setParent }}>{children}</CrumbContext.Provider>;
}

export function useCrumbLabel() {
  return useContext(CrumbContext).label;
}

export function useCrumbParent() {
  return useContext(CrumbContext).parent;
}

/** Render on a detail page to name it in the topbar breadcrumb (and the palette's recent items,
    with `hint` as its second line). `level="parent"` names the step above the page instead, from
    a layout, and `href` is where that step lives (remembered as the recent item). Renders nothing
    itself. */
export function Crumb({
  label,
  hint,
  icon,
  level = "page",
  href,
}: {
  label: string;
  hint?: string;
  icon?: string;
  level?: "page" | "parent";
  href?: string;
}) {
  const { set, setParent } = useContext(CrumbContext);
  const pathname = usePathname();
  const assign = level === "parent" ? setParent : set;
  useEffect(() => {
    assign(label);
    return () => assign(null);
  }, [label, assign]);
  const target = href ?? pathname;
  useEffect(() => {
    if (target) rememberRecent({ label, href: target, hint, icon });
  }, [label, hint, icon, target]);
  return null;
}
