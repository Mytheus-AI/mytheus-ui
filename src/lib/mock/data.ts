/* No data lives here any more. Every authenticated screen reads the backend through
   `api-gateway`, and the public marketing vignettes keep their copy in
   `components/landing/sample-content.ts`.

   This module survives only as a type re-export, because a few meeting-room files
   (`components/sidebar/AgentSidebar.tsx`, `components/meeting/MeetingRoom.tsx`,
   `components/room/ChatPanel.tsx`) still import their types from this path and are being
   changed by the Phase 11 sidebar work right now. Point those imports at `@/lib/types` once
   that lands, then delete this file. */

export type {
  AgentSidebarCard,
  ChatMessage,
  MeetingStatus,
  OrgContextValue,
  Priority,
  SidebarPriority,
} from "@/lib/types";
