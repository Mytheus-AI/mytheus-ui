/**
 * Shared UI view types that are not wire types. Wire types live in `lib/api/types.ts` (aliases
 * onto the generated OpenAPI schemas); these are the shapes components render.
 *
 * They used to live beside sample data in `lib/mock/data.ts`. That file no longer holds any
 * data; it only re-exports these for the few meeting-room files that still import from it.
 */

/** Who is signed in and which workspace they are in, resolved from the verified Clerk session
 *  by `resolveOrgContext()`. `org.id` is Clerk's opaque organization id, never our `org_id`. */
export type OrgContextValue = {
  org: {
    id: string;
    name: string;
    /** the workspace logo as a same-origin image URL (`/api/org-logo?v=`), when it has one */
    logoUrl?: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: "member" | "admin";
    /** the doodle this person chose (Clerk `unsafeMetadata.doodle`), if any */
    avatarSeed?: string;
    /** an uploaded or Google photo, used only when no doodle was chosen */
    imageUrl?: string;
  };
};

/** The three meeting states the UI renders; `present.ts` maps the server's four onto them. */
export type MeetingStatus = "live" | "upcoming" | "past";

/** The frozen priority colour language: red act now, yellow attention, blue info. */
export type Priority = "high" | "medium" | "low";

export type ChatMessage = { id: string; from: string; at: string; text: string };

export type SidebarPriority = "high" | "medium" | "low";

export type AgentSidebarCard =
  | { kind: "note"; lines: string[] }
  | { kind: "suggestion"; priority: SidebarPriority; text: string }
  | { kind: "decision"; title: string; detail: string }
  | { kind: "task"; title: string; assignee: string; due: string }
  | { kind: "context"; text: string; source: string }
  | { kind: "conflict"; text: string }
  | { kind: "workload"; person: string; util: number; text: string }
  | { kind: "stakeholder"; person: string; reason: string }
  | { kind: "dependency"; text: string };
