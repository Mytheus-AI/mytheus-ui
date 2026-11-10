"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";

/* Display names for the people in a call.

   Every identity in the room is an internal user id: the LiveKit participant identity, a chat
   message's sender, a caption's speaker. None of them is a name, and LiveKit tokens carry no
   name, so without this the room showed "Guest", raw ids in chat, and "Speaker 07b3…" on
   captions. The room page resolves the workspace's members once (server-side: internal id ->
   Clerk name) and provides them here; every component that labels a person reads from it. */

export type RoomPerson = {
  name: string;
  imageUrl: string | null;
  /** Their agent's chosen name and doodle seed (ADR-0038 D3), null for the defaults. */
  agentName?: string | null;
  agentSeed?: string | null;
};
export type RoomNames = Record<string, RoomPerson>;

const Ctx = createContext<RoomNames>({});

export function RoomNamesProvider({ names, children }: { names: RoomNames; children: ReactNode }) {
  return <Ctx.Provider value={names}>{children}</Ctx.Provider>;
}

/** Returns a lookup: an id's display name, or `fallback` (never the raw id) when unknown. */
export function useRoomName(): (id: string | undefined | null, fallback?: string) => string {
  const names = useContext(Ctx);
  return useCallback(
    (id, fallback = "Guest") => (id && names[id]?.name) || fallback,
    [names],
  );
}

export function useRoomPerson(id: string | undefined | null): RoomPerson | undefined {
  const names = useContext(Ctx);
  return id ? names[id] : undefined;
}

export function useRoomNames(): RoomNames {
  return useContext(Ctx);
}
