"use client";

/* Typed OrgContext per CLAUDE.md, resolved server-side from the verified Clerk session by
   `resolveOrgContext()` in the (app) and (admin) layouts and handed down through `OrgProvider`.
   The default below is only what a component sees outside any provider: blank, never a
   sample person or workspace. */

import { createContext, useContext, type ReactNode } from "react";
import type { OrgContextValue } from "./types";

const SIGNED_OUT: OrgContextValue = {
  org: { id: "", name: "" },
  user: { id: "", name: "", email: "", role: "member" },
};

const OrgContext = createContext<OrgContextValue>(SIGNED_OUT);

export function OrgProvider({
  value = SIGNED_OUT,
  children,
}: {
  value?: OrgContextValue;
  children: ReactNode;
}) {
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrgContext() {
  return useContext(OrgContext);
}
