"use client";

import { createContext, useContext, type ReactNode } from "react";

/** The signed-in person's Myte as it is now (name and face seed), resolved once in the (app)
    layout. Surfaces that show a stored snapshot of the agent, such as a briefing written last
    week, read this so a renamed or re-faced agent shows its current self everywhere. */
export type MyAgent = { name: string; seed: string; personality?: string | null };

const Ctx = createContext<MyAgent | null>(null);

export function MyAgentProvider({ value, children }: { value: MyAgent | null; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMyAgent(): MyAgent | null {
  return useContext(Ctx);
}
