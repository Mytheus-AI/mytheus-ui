/**
 * The wire types this app consumes, assembled from the generated OpenAPI types.
 *
 * Nothing here is hand-described any more. Every type below is an alias onto a schema in
 * `./generated/`, which `npm run generate:api` emits from `mytheus-backend`'s OpenAPI
 * documents, which that repo in turn emits from its FastAPI apps (ADR-0022). A server change
 * that this app has not caught up with is now a TypeScript error rather than a silent
 * mismatch, and `npm run generate:api:check` fails the build if the committed output has gone
 * stale against the spec.
 *
 * This file exists rather than importing `components["schemas"][...]` at every call site
 * because that path is unreadable, and because it is the one place to see which server schema
 * each screen actually depends on.
 *
 * WHAT THIS REPLACED, and why it mattered. These were hand-written interfaces "matched to the
 * FastAPI response models by name", kept in sync by attention. Attention had already lapsed:
 * the `ErrorCode` union in `client.ts` was missing `CONSENT_REQUIRED` and `NOT_A_PARTICIPANT`,
 * the two outcomes the meeting-join path exists to tell apart. A hand-written type does not
 * fail when it falls behind, it just quietly stops describing the server.
 *
 * `snake_case` throughout, because that is what the wire carries. Conversion to the view
 * models happens in `present.ts`, so no screen has to know which convention it is looking at.
 */

import type { components as BffSchemas } from "./generated/bff";
import type { components as CoreApiSchemas } from "./generated/core-api";

type Bff = BffSchemas["schemas"];
type CoreApi = CoreApiSchemas["schemas"];

/** Every `bff` panel carries its own status. `empty` and `degraded` are NOT interchangeable:
 *  one means "you have nothing", the other means "we could not load it". They need different
 *  empty states, and guessing from an empty array gets it wrong half the time. */
export type ArmStatus = Bff["MeetingsArm"]["status"];

/**
 * A panel. Generic for the callers that want to name their item type.
 *
 * The server declares one arm shape per panel (`MeetingsArm`, `TasksArm`, ...) rather than one
 * generic, because OpenAPI has no generics; this is the same contract expressed the way
 * TypeScript prefers to read it.
 */
export interface Arm<T> {
  status: ArmStatus;
  items: T[];
}

export type MeetingStatus = CoreApi["Meeting"]["status"];

/** The meetings-panel projection: six columns, not the whole `Meeting` resource. */
export type DashboardMeeting = Bff["DashboardMeeting"];

/** The caller's open task, for Your tasks (`action_items`). */
export type DashboardTask = Bff["DashboardTask"];

/** A confirmed decision from one of the caller's meetings (`decisions`). */
export type DashboardDecision = Bff["DashboardDecision"];

/** An ended meeting the caller was in, with confirmed counts (`recent_meetings`). */
export type DashboardRecentMeeting = Bff["DashboardRecentMeeting"];

/** An agent candidate still waiting for a person in one of the caller's meetings (`needs_review`). */
export type DashboardReviewItem = Bff["DashboardReviewItem"];

/** One of the caller's surfaced notes (`worklogs`). */
export type DashboardNote = Bff["DashboardNote"];

/** `GET /bff/dashboard`. Every arm is typed: each has a real read model behind it. */
export type DashboardResponse = Bff["Dashboard"];

/** `GET /api/v1/decisions`: confirmed decisions from the caller's meetings, newest first. */
export type DecisionLogEntry = CoreApi["DecisionLogEntry"];

export type Participant = CoreApi["Participant"];

/** The full meeting resource from `core-api`, as distinct from the dashboard projection. */
export type ApiMeeting = CoreApi["Meeting"];

/** Cursor pagination, never offset. `next_cursor` is opaque: build no logic on its contents. */
export type MeetingPage = CoreApi["MeetingPage"];

export type ApiTeam = CoreApi["Team"];
