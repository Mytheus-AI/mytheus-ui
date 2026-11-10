/**
 * Wire types for the room's top chrome (polish program, Phase 1): the agenda's "Start next", the
 * close-out wrap-up, the late joiner's catch-up line and asking a stand-in agent. Aliases onto the
 * generated core-api schemas, so a server change is a type error here, not a silent mismatch.
 *
 * Types only: the node test runner, client components and server actions can all import it.
 */

import type { components } from "./generated/core-api.ts";

type CoreApi = components["schemas"];

export type AgendaAdvancedWire = CoreApi["AgendaAdvanced"];
export type WrapUpWire = CoreApi["WrapUp"];
export type WrapUpCardWire = CoreApi["WrapUpCard"];
export type WrapUpClosedWire = CoreApi["WrapUpClosed"];
export type CatchUpSummaryWire = CoreApi["CatchUpSummary"];
export type StandInAnswerWire = CoreApi["StandInAnswer"];
export type StandInSourceWire = CoreApi["StandInSource"];
