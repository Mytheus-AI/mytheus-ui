"use client";

import { createContext, useContext } from "react";
import type { AskPage } from "@/lib/ask-myte/types";

/* The Ask Myte sheet's context, in a module of its own so the entry points (Your Myte's ask box,
   "Ask about this meeting", the command palette) can open the sheet without importing it. */

export type OpenOptions = { page?: AskPage | null; question?: string | null };
export type Ctx = { open: (opts?: OpenOptions) => void; close: () => void; isOpen: boolean };
export type Request = { page: AskPage | null; question: string | null; n: number };
export type Layer = Ctx & { loaded: boolean; request: Request | null; onAsk: boolean };

export const AskMyteContext = createContext<Layer>({ open: () => {}, close: () => {}, isOpen: false, loaded: false, request: null, onAsk: false });

export function useAskMyteSheet(): Ctx {
  const { open, close, isOpen } = useContext(AskMyteContext);
  return { open, close, isOpen };
}

