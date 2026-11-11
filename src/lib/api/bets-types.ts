/**
 * Wire types for decisions as bets and the company time machine, taken from core-api's emitted
 * spec (never hand-kept). Type-only, so pure helpers and client components may import it.
 */

import type { components } from "./generated/core-api";

type S = components["schemas"];

export type Bet = S["Bet"];
export type BetEvidence = S["BetEvidence"];
export type DecisionBetView = S["DecisionBetView"];
export type BetHints = S["BetHints"];
export type Lesson = S["Lesson"];
export type BetUpsert = S["BetUpsert"];
export type BetResolve = S["BetResolve"];
export type MyBets = S["MyBets"];
export type MyBet = S["MyBet"];
export type Calibration = S["Calibration"];
export type GroupRecord = S["GroupRecord"];
export type CalibrationBucket = S["CalibrationBucket"];

export type BetStatus = Bet["status"];
export type BetKind = Bet["kind"];
export type Direction = Bet["direction"];
export type BetSource = Bet["source"];
export type Category = Bet["category"];
export type Outcome = NonNullable<Bet["outcome"]>;

export type Snapshot = S["Snapshot"];
export type DecisionAtDate = S["DecisionAtDate"];
export type ReplacedAtDate = S["ReplacedAtDate"];
export type PromiseAtDate = S["PromiseAtDate"];
export type GoalAtDate = S["GoalAtDate"];
export type DecisionRef = S["DecisionRef"];
export type MeetingAtDate = S["MeetingAtDate"];
export type Diff = S["Diff"];
export type Reversal = S["Reversal"];
export type PromiseChange = S["PromiseChange"];
export type BetChange = S["BetChange"];
export type GoalChange = S["GoalChange"];
export type MeetingImpact = S["MeetingImpact"];
export type Timeline = S["Timeline"];
export type TimelineStep = S["TimelineStep"];
