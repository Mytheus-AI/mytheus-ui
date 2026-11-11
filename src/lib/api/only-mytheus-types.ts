/**
 * Wire types for the "Only Mytheus" wave (decision reversal, delegated answers, the meeting
 * precheck, status requests asked from the precheck, and the weekly digest), all on core-api
 * except the precheck, which is a `bff` screen read.
 *
 * Every type is an alias onto the generated OpenAPI schemas (`npm run generate:api`), like
 * `types.ts`. Two of them are also offered in a "view" shape whose lists are always present:
 * the server may leave an empty list out, and `normalizeDigest` / the precheck route handler fill
 * it in once at the boundary, so no screen has to guard every array.
 *
 * `snake_case`, because that is what the wire carries.
 */

import type { components as BffSchemas } from "./generated/bff";
import type { components as CoreApiSchemas } from "./generated/core-api";

type Bff = BffSchemas["schemas"];
type CoreApi = CoreApiSchemas["schemas"];

/* ---------------- decision reversal ---------------- */

export type DecisionReversal = CoreApi["DecisionReversal"];
export type DecisionReversalList = CoreApi["DecisionReversalList"];
export type ReversalDecision = CoreApi["ReversalDecision"];
export type ReversalAction = CoreApi["ReversalAction"];
export type ReversalStatus = DecisionReversal["status"];
export type ReversalResolveBody = CoreApi["ReversalResolve"];
export type ReversalResolution = ReversalResolveBody["resolution"];

/* ---------------- delegated answers ---------------- */

export type DelegatedAnswers = CoreApi["DelegatedAnswers"];
export type DelegatedStatement = CoreApi["DelegatedStatement"];
export type DelegatedAnswerLog = CoreApi["DelegatedAnswerLog"];
export type DelegatedAnswerEntry = CoreApi["DelegatedAnswerEntry"];

/* ---------------- should this be a meeting? ---------------- */

export type PrecheckRequest = Bff["PrecheckRequest"];
export type PrecheckDecided = Bff["DecidedHint"];
export type PrecheckStatusUpdate = Bff["StatusHint"];
export type PrecheckStatusAction = Bff["StatusAction"];
export type PrecheckRecentMeeting = Bff["RecentMeeting"];
/** `POST /bff/meetings/precheck` as the server sends it (empty lists may be left out). */
export type MeetingPrecheckWire = Bff["MeetingPrecheck"];
/** The same, with every list present (the route handler fills them in). */
export type MeetingPrecheck = MeetingPrecheckWire &
  Required<Pick<MeetingPrecheckWire, "already_decided" | "status_updates" | "recent_meetings">>;

export type StatusRequestsAsked = CoreApi["StatusRequestsAsked"];
export type StatusAskReason = CoreApi["StatusAskItem"]["reason"];

/* ---------------- weekly digest ---------------- */

export type DigestPreferences = CoreApi["DigestPreferences"];
export type DigestSummary = CoreApi["DigestSummary"];
export type DigestList = CoreApi["DigestList"];
/** `WeeklyDigest` as the server sends it (empty lists may be left out). */
export type WeeklyDigestWire = CoreApi["WeeklyDigest"];
type DigestLists = "topics" | "decisions" | "decision_changes" | "actions_assigned" | "actions_closed" | "promises_due";
/** The same, with every list present and `id` / `created_at` explicit (`normalizeDigest`). */
export type WeeklyDigest = Omit<WeeklyDigestWire, DigestLists | "id" | "created_at"> &
  Required<Pick<WeeklyDigestWire, DigestLists | "id" | "created_at">>;
// Element types are taken from the digest itself (server schemas `WeeklyDigestDecision`,
// `WeeklyDigestChange`, `WeeklyDigestAction`, `WeeklyDigestPromise`).
export type DigestDecision = WeeklyDigest["decisions"][number];
export type DigestDecisionChange = WeeklyDigest["decision_changes"][number];
export type DigestAction = WeeklyDigest["actions_assigned"][number];
export type DigestPromise = WeeklyDigest["promises_due"][number];
export type LatestDigestWire = CoreApi["DigestLatest"];
export type LatestDigest = { digest: WeeklyDigest | null; next_run_at: string };
