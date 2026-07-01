"use client";

/* Typed OrgContext per CLAUDE.md — normally resolved from the Clerk session
   JWT's `org` claim in (app)/layout.tsx. Auth isn't wired up yet, so this is
   seeded from static mock data. Swap the provider value for a real Clerk
   session lookup once auth lands; nothing downstream should need to change. */

import { createContext, useContext, type ReactNode } from "react";
import { mockOrgContext, type OrgContextValue } from "./mock/data";

const OrgContext = createContext<OrgContextValue>(mockOrgContext);

export function OrgProvider({
  value = mockOrgContext,
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
