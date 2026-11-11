/**
 * The three Layer 1 "after the meeting" features on core-api (`/api/v1`, a3 room signals contract):
 * the last word, the agreement check (the fake-consensus detector) and pick up where we stopped.
 *
 * Hand-written from the contract until `lib/api/generated/core-api.ts` is regenerated from the
 * spec; structurally identical to the server's responses (snake_case JSON). Type-only, so the node
 * test runner can import it.
 */

export type SignalKind =
  "spoken_over" | "hand_not_called" | "cut_off" | "topic_silent";
export type NudgeStatus = "open" | "contributed" | "dismissed";

export interface LastWordNudge {
  id: string;
  meeting_id: string;
  meeting_title: string;
  kind: SignalKind;
  /** a lowercase noun phrase: "pricing for the enterprise tier" */
  topic: string;
  /** "You started to say something about pricing. Want to add it?" */
  prompt: string;
  /** their own partial words, verbatim, when there are some */
  quote: string | null;
  at_ms: number | null;
  end_ms: number | null;
  decision_id: string | null;
  decision_content: string | null;
  status: NudgeStatus;
  created_at: string;
}

export interface LastWordList {
  items: LastWordNudge[];
}

export interface LateContribution {
  id: string;
  meeting_id: string;
  user_id: string;
  author_name: string;
  nudge_id: string | null;
  decision_id: string | null;
  at_ms: number | null;
  body: string | null;
  has_audio: boolean;
  audio_duration_ms: number | null;
  created_at: string;
  mine: boolean;
}

export interface LateContributionList {
  items: LateContribution[];
}

export type AudioMime = "audio/webm" | "audio/ogg" | "audio/mp4" | "audio/mpeg";

export interface LateContributionCreate {
  body?: string;
  nudge_id?: string;
  decision_id?: string;
  at_ms?: number;
  audio?: { data_base64: string; mime: AudioMime; duration_ms: number };
}

export type AgreementStrength = "strong" | "mixed" | "weak" | "unclear";

export interface AfterSignalsDecision {
  decision_id: string;
  agreement: AgreementStrength | null;
  late_contribution_count: number;
  window_ends_at: string;
  in_window: boolean;
  you_own: boolean;
}

export interface ResumePosition {
  user_id: string | null;
  name: string | null;
  quote: string;
  start_ms: number;
  end_ms: number;
}

export interface ResumeCutOff {
  user_id: string;
  name: string;
  quote: string;
  start_ms: number;
  end_ms: number;
}

export type ResumeReason = "time_ran_out" | "agenda_unfinished" | "cut_off";
export type ResumeStatus = "open" | "continued" | "dismissed";

export interface ResumePoint {
  id: string;
  /** the meeting it was saved from */
  meeting_id: string;
  meeting_title: string;
  meeting_ended_at: string | null;
  reason: ResumeReason;
  topic: string;
  /** "Raj was halfway through explaining the migration risk" */
  headline: string;
  positions: ResumePosition[];
  cut_off: ResumeCutOff | null;
  agenda_item_id: string | null;
  status: ResumeStatus;
  continued_in_meeting_id: string | null;
  created_at: string;
}

export interface ResumePointRead {
  /** an open point carried into this meeting from the one it follows (or the same people's last) */
  incoming: ResumePoint | null;
  /** the point saved from this meeting, for the next one */
  saved: ResumePoint | null;
}

export interface AfterSignals {
  meeting_id: string;
  /** the analyzer's result has arrived for this meeting */
  analyzed: boolean;
  my_nudge: LastWordNudge | null;
  late_contributions: LateContribution[];
  decisions: AfterSignalsDecision[];
  /** the point saved from this meeting */
  resume_point: ResumePoint | null;
}

export type AgreementAnswer = "support" | "concerns" | "object";
export type AgreementCheckStatus = "asked" | "answered";

export interface AgreementCheck {
  id: string;
  decision_id: string;
  decision_content: string;
  meeting_id: string;
  meeting_title: string;
  status: AgreementCheckStatus;
  answer: AgreementAnswer | null;
  note: string | null;
  share_name: boolean;
  answered_at: string | null;
  created_at: string;
}

export interface AgreementCheckList {
  items: AgreementCheck[];
}

export interface AgreementAnswerBody {
  answer: AgreementAnswer;
  note?: string;
  share_name: boolean;
}

export interface AgreementInMeeting {
  yes: number;
  hedged: number;
  silent: number;
  objected: number;
  talked_over: number;
}

export interface AgreementSummary {
  participants: number;
  support: number;
  concerns: number;
  object: number;
  pending: number;
  in_meeting: AgreementInMeeting;
}

export interface AgreementNote {
  text: string;
  /** null for an unsigned note (sent only once three or more people answered) */
  author_name: string | null;
  answer: AgreementAnswer;
  at: string;
}

export interface DecisionAgreement {
  decision_id: string;
  meeting_id: string;
  strength: AgreementStrength | null;
  analyzed_at: string | null;
  you_own: boolean;
  /** the decision owner only */
  summary: AgreementSummary | null;
  /** the decision owner only */
  notes: AgreementNote[];
  my_check: AgreementCheck | null;
}

/** Additive on the public recap (`GET /api/v1/public/shares/{token}`): text only. */
export interface PublicLateContribution {
  author_name: string;
  body: string;
  created_at: string;
}

/* ---------------------------------------------------------------------------------------------
   Drift guard: every response type above must be exactly what core-api's spec says (the
   generated `core-api.ts`, regenerated with `npm run generate:api`). The server always sends its
   defaulted fields, so the generated optionals are compared as required. A change on either side
   that is not mirrored on the other fails `tsc`.
   --------------------------------------------------------------------------------------------- */
import type { components } from "./generated/core-api.ts";

type Schemas = components["schemas"];
type DeepRequired<T> = T extends (infer U)[]
  ? DeepRequired<U>[]
  : T extends object
    ? { [K in keyof T]-?: DeepRequired<T[K]> }
    : T;
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Check<T extends true> = T;

export type RoomSignalsSpecChecks = [
  Check<
    Same<DeepRequired<Schemas["AfterSignals"]>, DeepRequired<AfterSignals>>
  >,
  Check<
    Same<DeepRequired<Schemas["LastWordList"]>, DeepRequired<LastWordList>>
  >,
  Check<
    Same<
      DeepRequired<Schemas["LateContributionList"]>,
      DeepRequired<LateContributionList>
    >
  >,
  Check<
    Same<
      DeepRequired<Schemas["AgreementCheckList"]>,
      DeepRequired<AgreementCheckList>
    >
  >,
  Check<
    Same<
      DeepRequired<Schemas["DecisionAgreement"]>,
      DeepRequired<DecisionAgreement>
    >
  >,
  Check<
    Same<
      DeepRequired<Schemas["ResumePointRead"]>,
      DeepRequired<ResumePointRead>
    >
  >,
  Check<
    Same<
      DeepRequired<Schemas["RecapLateContribution"]>,
      DeepRequired<PublicLateContribution>
    >
  >,
  Check<
    Same<
      DeepRequired<Schemas["MeetingMinutesView"]>["late_contributions"],
      DeepRequired<LateContribution>[]
    >
  >,
];
