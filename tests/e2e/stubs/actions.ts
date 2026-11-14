import { applyUpdate, forgotten, type MemoryUpdate, type PersonMemory } from "../../../src/lib/memory";
import { MEMORY_FIXTURE } from "../memory-fixture";
import { CAPACITY, CHECK_FULL, LEDGER, TODAY } from "../ledger-fixture";
import { addDays, type LedgerPromise } from "../../../src/lib/promises/ledger";
import { BRIEFING as BRIEFING_READY, SETTINGS as BRIEFING_SETTINGS, WRITING as BRIEFING_WRITING } from "../briefing-fixture";
import {
  BLAST as WB_BLAST,
  MEETING_BLAST as WB_MEETING_BLAST,
  MEMBERS as WB_MEMBERS,
  SETTLEMENT as WB_SETTLEMENT,
  SLOT as WB_SLOT,
  WHY as WB_WHY,
} from "../why-blast-fixture";
import type { Assumption as WbAssumption, Settlement as WbSettlement } from "../../../src/lib/api/why-blast-types";
import { BET, DIFF, SNAPSHOT, TIMELINE, view as betView } from "../bets-fixture";

// The server actions the room calls, answered as core-api would on success.
const row = (id: string) => ({ id, content: "Ship the beta on 2 December", status: "confirmed", confirmed_by: "u-maya" });
export async function confirmCandidate(_kind: string, id: string) {
  return { ok: true as const, row: row(id) };
}
export async function dismissCandidate(_kind: string, id: string) {
  return { ok: true as const, row: { ...row(id), status: "dismissed" } };
}
export async function editCandidate(_kind: string, id: string, fields: { content: string }) {
  return { ok: true as const, row: { ...row(id), status: "proposed", content: fields.content } };
}
export async function setAgendaItemStatus() {
  return { ok: false as const, message: "Not available in this test." };
}
export async function replaceAgenda() {
  return { ok: false as const, message: "Not available in this test." };
}
export async function setAttendance() {
  return { ok: false as const, message: "Not available in this test." };
}
export async function dismissContextFill() {
  return { ok: true as const };
}
export async function dismissAlert() {
  return { ok: true as const };
}
export async function markAlertRead() {
  return { ok: true as const };
}
export async function askSuggestion() {
  return { ok: true as const };
}
export async function dismissSuggestion() {
  return { ok: true as const };
}
export async function saveSuggestion() {
  return { ok: true as const };
}
export async function createMeeting() {
  return { ok: false as const, message: "Not available in this test." };
}
export async function draftAgenda() {
  return { ok: false as const, message: "Not available in this test." };
}
export async function inviteToMeeting() {
  return { ok: false as const, message: "Not available in this test." };
}
// Ask your agent (the room's private ask box) and the promise lookup.
let askFailures = 0;
export async function askAgent(question: string) {
  // "offline" fails once, as an unreachable rag-service would, so the test can retry.
  if (question.includes("offline") && askFailures++ === 0) {
    return { ok: false as const, reason: "unavailable" as const, message: "Your Myte could not answer just now. Try again in a moment." };
  }
  return {
    ok: true as const,
    data: {
      question,
      answer: "Launch moved to 2 December after QA signed off [1]. Pricing stays at 25 dollars [2].",
      abstained: false,
      degraded: false,
      citations: [
        { n: 1, text: "QA signed off on the beta, so we ship on the second.", kind: "decision", meeting_id: "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d", decision_id: "33333333-3333-4333-8333-333333333333", meeting_title: "Q4 launch review" },
        { n: 2, text: "Pro stays at 25 dollars a seat.", kind: "transcript", meeting_id: "44444444-4444-4444-8444-444444444444", meeting_title: "Pricing review", occurred_at: "2026-11-04T10:00:00Z", speaker: "Raj Patel", start_ms: 754_200 },
        {
          n: 3,
          text: "Pricing policy: list prices change once a quarter, after the pricing review signs off. Existing customers keep their price until renewal, and any discount above 20 percent needs the finance lead's approval in writing before it is offered.",
          kind: "document",
          document_id: "66666666-6666-4666-8666-666666666666",
        },
      ],
    },
  };
}
export async function findMeetingPromise() {
  return { ok: true as const, id: "55555555-5555-4555-8555-555555555555", status: "open" as const };
}
export async function setCommitmentStatus() {
  return { ok: true as const };
}
export async function askQuestion() {
  return { ok: false as const, message: "Not available in this test." };
}

// Phase 4 reach (Settings > API access, decision sharing, Workspace > Data erasure).
const NOW = "2026-11-11T10:00:00Z";
export async function createToken(input: { name: string; scope: "read" | "read_write"; expiresInDays: number }) {
  return {
    ok: true as const,
    token: "mytheus_pat_test_0000000000000000000000000000abcd",
    item: {
      id: "33333333-3333-4333-8333-333333333333",
      user_id: "u-maya",
      name: input.name,
      scope: input.scope,
      state: "active" as const,
      token_preview: "mytheus_pat_...abcd",
      created_at: NOW,
      expires_at: "2027-02-09T10:00:00Z",
    },
  };
}
export async function revokeToken() {
  return { ok: true as const };
}
export async function createDecisionShare() {
  return { ok: true as const, id: "44444444-4444-4444-8444-444444444444", url: "https://app.mytheus.cloud/s/test" };
}
export async function revokeDecisionShare() {
  return { ok: true as const };
}
export async function exportDecision() {
  return { ok: true as const, url: "https://www.notion.so/test", replaced: false };
}
export async function eraseData() {
  return { ok: true as const, summary: "3 notes and 1 promise removed", label: "Pricing review" };
}

// Settings > Agent memory (wave 3): answered as core-api would, from the harness's fixture.
let memoryState: PersonMemory = MEMORY_FIXTURE;
export async function updateMemory(update: MemoryUpdate) {
  if ((update.pin_topics ?? []).includes("Refuse me")) return { ok: false as const, message: "Your change could not be saved just now. Try again in a moment." };
  memoryState = applyUpdate(memoryState, update);
  return { ok: true as const, memory: memoryState };
}
export async function forgetEverything() {
  memoryState = forgotten(memoryState);
  return { ok: true as const };
}

// Off the record and the consent receipt (wave 3), answered as core-api and meeting-service would.
const offRecordState = (active: boolean, requestedBy: string | null = null) => {
  const started = new Date(Date.now() - 4 * 60_000).toISOString();
  const seg = {
    id: "66666666-6666-4666-8666-666666666666",
    started_at: started,
    started_by: "u-maya",
    requested_by: requestedBy,
    ended_at: active ? null : new Date().toISOString(),
    ended_by: active ? null : "u-maya",
    start_ms: 600_000,
    end_ms: active ? null : 840_000,
    duration_ms: active ? null : 240_000,
  };
  const state = { meeting_id: "m", active, current: active ? seg : null, segments: [seg], total_ms: active ? 0 : 240_000, can_toggle: true };
  return {
    ok: true as const,
    state,
    wire: {
      active,
      segmentId: seg.id,
      startedAt: seg.started_at,
      startedBy: seg.started_by,
      requestedBy,
      endedAt: seg.ended_at,
      endedBy: seg.ended_by,
      totalMs: state.total_ms,
      at: new Date().toISOString(),
    },
  };
};
export async function startOffRecord(_meetingId: string, requestedBy: string | null = null) {
  return offRecordState(true, requestedBy);
}
export async function endOffRecord() {
  return offRecordState(false);
}
export async function loadOffRecord() {
  return offRecordState(false);
}
export async function loadConsentReceipt(meetingId: string) {
  return {
    ok: true as const,
    receipt: {
      meeting_id: meetingId,
      meeting_title: "Q4 launch review",
      consent_required: true,
      consented: true,
      consented_at: "2026-11-11T09:59:00Z",
      consent_version: "room-notice-2026-11-12",
      current_version: "room-notice-2026-11-12",
      recording: false,
      clauses: [
        { key: "transcript", title: "A transcript is kept", body: "What is said is transcribed with who said it." },
        { key: "off_record", title: "You can go off the record", body: "Anyone can ask the host to go off the record." },
      ],
    },
  };
}

// Only-Mytheus wave: decision reversal, delegated answers, the precheck's status ask, digest prefs.
const REV = {
  id: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b",
  status: "kept",
  created_at: "2026-11-10T09:00:00Z",
  resolved_at: "2026-11-11T09:00:00Z",
  old_decision: { id: "d-old", content: "Ship the beta to 40 customers", meeting_id: "m-1", meeting_title: "Beta review", decided_at: "2026-10-03T10:00:00Z" },
  new_decision: { id: "d-new", content: "Ship the beta to 10 design partners", meeting_id: "m-2", meeting_title: "Launch sync", decided_at: "2026-11-10T10:00:00Z" },
  action: { id: "a-1", content: "Email the 40 beta customers", due_date: "2026-11-20", status: "confirmed", meeting_id: "m-1", meeting_title: "Beta review" },
};
export async function resolveDecisionReversal(_id: string, resolution: string, fields: { content?: string; due_date?: string | null } = {}) {
  const status = resolution === "keep" ? "kept" : resolution === "close" ? "closed" : "rescoped";
  return {
    ok: true as const,
    reversal: { ...REV, status, action: { ...REV.action, content: fields.content ?? REV.action.content, due_date: fields.due_date === undefined ? REV.action.due_date : fields.due_date } },
  };
}
export async function saveDelegatedAnswers(meetingId: string, statements: string[]) {
  return {
    ok: true as const,
    saved: {
      meeting_id: meetingId,
      attendance: "agent" as const,
      editable: true,
      max_statements: 10,
      max_chars: 300,
      statements: statements.map((text, position) => ({ id: `s-${position}`, text, position, updated_at: "2026-11-11T09:00:00Z" })),
    },
  };
}
export async function askForStatusInstead(actionIds: string[]) {
  const names = ["Raj Patel", "Priya Nair", "Diego Ruiz"];
  return {
    ok: true as const,
    asked: {
      requested: actionIds.length,
      skipped: 0,
      items: actionIds.map((action_id, i) => ({ action_id, request_id: `r-${i}`, owner_name: names[i] ?? null, reason: "requested" as const })),
    },
  };
}
export async function saveDigestPreferences(prefs: { weekly_enabled: boolean; email_enabled: boolean }) {
  return { ok: true as const, prefs };
}

// Recording playback (wave 3): the Recording card's re-reads and clip writes, answered as
// meeting-service and core-api would on success.
const REC_URL = "https://recordings.test/segment.mp4";
export async function loadRecording(meetingId: string) {
  return {
    ok: true as const,
    data: {
      meeting_id: meetingId,
      status: "ready" as const,
      reason: null,
      duration_ms: 24_000,
      url_expires_at: new Date(Date.now() + 600_000).toISOString(),
      segments: [
        { id: "s-1", status: "ready" as const, media_type: "video/mp4" as const, offset_ms: 0, duration_ms: 12_000, started_at: "2026-11-10T15:00:00Z", ended_at: null, url: `${REC_URL}?a` },
        { id: "s-2", status: "ready" as const, media_type: "video/mp4" as const, offset_ms: 30_000, duration_ms: 12_000, started_at: "2026-11-10T15:00:30Z", ended_at: null, url: `${REC_URL}?b` },
      ],
    },
  };
}
export async function loadClips() {
  return { ok: true as const, data: { items: [], max_duration_ms: 600_000 } };
}
export async function createClip(meetingId: string, input: { title: string; startMs: number; endMs: number }) {
  return {
    ok: true as const,
    clip: {
      id: "c-new",
      meeting_id: meetingId,
      title: input.title,
      start_ms: input.startMs,
      end_ms: input.endMs,
      duration_ms: input.endMs - input.startMs,
      created_by: "u-sarah",
      created_by_name: "Sarah Okafor",
      created_at: "2026-11-11T09:00:00Z",
      can_delete: true,
      share_links: [],
    },
  };
}
export async function deleteClip() {
  return { ok: true };
}
export async function shareClip(meetingId: string, clipId: string, input: { includeVideo: boolean }) {
  return {
    ok: true as const,
    link: {
      id: "l-new",
      clip_id: clipId,
      meeting_id: meetingId,
      url: "https://app.example/s/clip-token-abc",
      token: "clip-token-abc",
      include_video: input.includeVideo,
      created_by: "u-sarah",
      created_by_name: "Sarah Okafor",
      created_at: "2026-11-11T09:00:00Z",
      expires_at: "2026-12-11T09:00:00Z",
      revoked_at: null,
      state: "active" as const,
      view_count: 0,
      last_viewed_at: null,
      can_revoke: true,
    },
  };
}
export async function revokeClipLink() {
  return { ok: true };
}
// Connecting an app over OAuth (the consent page and Connected apps). The consent answer returns
// to this same page with a hash, so the test can watch the "returning you" state without leaving.
export async function decideAppConsent(input: { request: string; decision: "approve" | "deny" }) {
  if (input.request === "expired") return { ok: false as const, message: "This request can no longer be approved.", problem: "expired_request" as const };
  return { ok: true as const, decision: input.decision, redirectTo: `${window.location.href.split("#")[0]}#returned-${input.decision}` };
}
export async function disconnectConnectedApp() {
  return { ok: true as const };
}
// Decisions that follow you: dismissing a challenge and answering a request to reopen a decision.
const REOPEN_BASE = {
  id: "11111111-2222-4333-8444-555555555555",
  decision_id: "d-1",
  decision_content: "Price the team plan at $18 a seat",
  meeting_id: "m-1",
  meeting_title: "Pricing review",
  requested_by: { id: "u-raj", name: "Raj Patel" },
  owner: { id: "u-maya", name: "Maya Chen" },
  reason: null,
  quote: null,
  source: "app" as const,
  place_label: null,
  link: null,
  status: "pending" as const,
  outcome: null,
  follow_up_action_id: null,
  revisit_meeting_id: null,
  response_note: null,
  created_at: "2026-11-11T09:00:00Z",
  resolved_at: null,
  viewer_role: "requester" as const,
};
export async function dismissChallenge(id: string) {
  return {
    ok: true as const,
    challenge: {
      id,
      decision_id: "d-1",
      source: "slack" as const,
      place_label: "#pricing",
      link: null,
      quote: "Dismissed",
      why: "",
      relation: "contradicts" as const,
      confidence: 0.8,
      status: "dismissed" as const,
      author: null,
      created_at: "2026-11-11T09:00:00Z",
      reopen_request_id: null,
    },
  };
}
export async function askToReopen(_decisionId: string, _meetingId: string, reason: string) {
  return { ok: true as const, request: { ...REOPEN_BASE, id: "22222222-2222-4333-8444-555555555555", reason: reason || null } };
}
export async function withdrawReopen(id: string) {
  return { ok: true as const, request: { ...REOPEN_BASE, id, status: "withdrawn" as const } };
}
export async function acceptReopen(id: string, body: { outcome: "revisit" | "follow_up"; note?: string }) {
  return {
    ok: true as const,
    request: {
      ...REOPEN_BASE,
      id,
      viewer_role: "owner" as const,
      status: "accepted" as const,
      outcome: body.outcome,
      revisit_meeting_id: body.outcome === "revisit" ? "m-revisit" : null,
      follow_up_action_id: body.outcome === "follow_up" ? "a-follow" : null,
      response_note: body.note ?? null,
    },
  };
}
export async function declineReopen(id: string, note?: string) {
  return { ok: true as const, request: { ...REOPEN_BASE, id, viewer_role: "owner" as const, status: "declined" as const, response_note: note ?? null } };
}

// a3 room signals: the last word, the agreement check and pick up where we stopped, answered as
// core-api would. The room's resume point comes from `window.__resumeFixture` (set by a test with
// addInitScript), so every other room test keeps a room with no pinned thread.
type RoomSignalsWindow = { __resumeFixture?: unknown; __agreementFail?: boolean };
const rsw = () => globalThis as unknown as RoomSignalsWindow;
export async function dismissLastWord(id: string) {
  return {
    ok: true as const,
    nudge: {
      id,
      meeting_id: "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
      meeting_title: "Pricing review",
      kind: "cut_off" as const,
      topic: "pricing",
      prompt: "You started to say something about pricing. Want to add it?",
      quote: null,
      at_ms: 754_000,
      end_ms: 757_000,
      decision_id: null,
      decision_content: null,
      status: "dismissed" as const,
      created_at: "2026-11-11T09:00:00Z",
    },
  };
}
export async function deleteLateContribution() {
  return { ok: true as const };
}
export async function loadAfterSignals() {
  return { ok: false as const, reason: "error" as const };
}
export async function answerAgreementCheck(id: string, answer: "support" | "concerns" | "object", fields: { note?: string; shareName?: boolean } = {}) {
  if (rsw().__agreementFail) return { ok: false as const, message: "Couldn't send your answer just now. Try again in a moment." };
  return {
    ok: true as const,
    check: {
      id,
      decision_id: "33333333-3333-4333-8333-333333333333",
      decision_content: "Raise the team plan to 18 dollars a seat in January",
      meeting_id: "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
      meeting_title: "Pricing review",
      status: "answered" as const,
      answer,
      note: fields.note?.trim() || null,
      share_name: Boolean(fields.shareName),
      answered_at: "2026-11-11T10:00:00Z",
      created_at: "2026-11-11T09:00:00Z",
    },
  };
}
export async function loadResumePoint() {
  const p = rsw().__resumeFixture ?? null;
  return { ok: true as const, data: { incoming: p, saved: null } };
}
export async function continueResumePoint(id: string, meetingId: string) {
  const p = rsw().__resumeFixture as Record<string, unknown> | undefined;
  return { ok: true as const, point: { ...(p ?? {}), id, status: "continued", continued_in_meeting_id: meetingId } };
}
export async function dismissResumePoint(id: string) {
  const p = rsw().__resumeFixture as Record<string, unknown> | undefined;
  return { ok: true as const, point: { ...(p ?? {}), id, status: "dismissed" } };
}
export async function loadReplay() {
  return { ok: false as const, reason: "none" as const };
}
export async function answerStatusRequest() {
  return { ok: false as const, message: "Not available in this test." };
}


// The promise ledger (Beyond the meeting, Layer 2), answered as core-api would on success.

const ledgerRow = (id: string, over: Partial<LedgerPromise> = {}): LedgerPromise => ({
  ...(LEDGER.items.find((p) => p.id === id) ?? LEDGER.items[0]),
  id,
  ...over,
});
export async function loadLedger() {
  return { ok: true as const, ledger: LEDGER };
}
export async function loadCapacity() {
  return { ok: true as const, capacity: CAPACITY };
}
export async function checkCapacity(dueDate: string) {
  const full = dueDate === CHECK_FULL.due_date;
  return {
    ok: true as const,
    check: full
      ? CHECK_FULL
      : { ...CHECK_FULL, due_date: dueDate, level: "ok" as const, items_on_day: 2, warn: false, message: "That makes 2 things due then; your day still has room.", suggested_date: null, suggested_label: null },
  };
}
export async function checkAcceptedAction() {
  return { ok: true as const, check: null };
}
export async function setPromiseStatus(id: string, status: "open" | "done" | "dismissed") {
  return { ok: true as const, promise: ledgerRow(id, { status, done_at: status === "done" ? `${TODAY}T10:00:00Z` : null }) };
}
export async function setPromiseDue(id: string, due: string | null) {
  return { ok: true as const, promise: ledgerRow(id, { due_at: due }) };
}
export async function confirmPromise(id: string) {
  return { ok: true as const, promise: ledgerRow(id, { review_state: "confirmed" }), capacity: CHECK_FULL };
}
export async function addPromise(input: { content: string; dueAt: string | null }) {
  return {
    ok: true as const,
    promise: ledgerRow("aaaaaaaa-aaaa-4aaa-8aaa-000000000099", { content: input.content, due_at: input.dueAt, channel: "manual", review_state: "confirmed", status: "open" }),
    capacity: input.dueAt === CHECK_FULL.due_date ? CHECK_FULL : null,
  };
}
export async function handOffPromise(id: string) {
  return { ok: true as const, promise: ledgerRow(id, { status: "dismissed", handed_off_to: "u-raj", handed_off_to_name: "Raj Patel" }), name: "Raj Patel" };
}
export async function undoHandOff(id: string) {
  return { ok: true as const, promise: ledgerRow(id) };
}
export async function renegotiateDate(input: { target: "commitment" | "action"; targetId: string; proposedDue: string }) {
  const row = LEDGER.items.find((p) => p.id === input.targetId);
  if (row?.recipient_user_id) {
    return {
      ok: true as const,
      result: {
        mode: "proposed" as const,
        target: input.target,
        target_id: input.targetId,
        due_at: row.due_at,
        previous_due: row.due_at,
        proposal: {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-000000000077",
          target: input.target,
          target_id: input.targetId,
          content: row.content,
          current_due: row.due_at,
          proposed_due: input.proposedDue,
          note: null,
          state: "pending" as const,
          proposer_id: "u-maya",
          proposer_name: "Maya Chen",
          requester_id: row.recipient_user_id,
          requester_name: row.recipient_name,
          created_at: `${TODAY}T10:00:00Z`,
          decided_at: null,
        },
      },
    };
  }
  return { ok: true as const, result: { mode: "applied" as const, target: input.target, target_id: input.targetId, due_at: input.proposedDue, previous_due: row?.due_at ?? addDays(TODAY, 1), proposal: null } };
}
export async function decideProposal(id: string, verb: string) {
  return { ok: true as const, proposal: { id, state: verb === "accept" ? "accepted" : verb === "decline" ? "declined" : "withdrawn" } };
}
export async function saveCapturePreferences(prefs: { slack_enabled: boolean; email_enabled: boolean }) {
  return { ok: true as const, capture: { ...prefs, email_connected: false } };
}
// A briefing from your agent: Brief me answers a briefing being written, a poll answers it ready.
export async function briefMe() {
  return { ok: true as const, briefing: { ...BRIEFING_WRITING, status: "pending" as const } };
}
export async function pollBriefing() {
  return { ok: true as const, briefing: BRIEFING_READY };
}
export async function markBriefingHeard() {
  return { ok: true as const, briefing: { ...BRIEFING_READY, listened_at: "2026-11-11T10:05:00Z" } };
}
export async function briefingAudioUrl() {
  return { ok: false as const, message: "No recorded voice in this test." };
}
export async function saveBriefingPreferences(prefs: Record<string, unknown>) {
  return { ok: true as const, settings: { ...BRIEFING_SETTINGS, ...prefs } };
}
// "Decisions that know why", blast radius and settle threads (a4): answered as core-api would.
export async function readDecisionWhy() {
  return { ok: true as const, data: WB_WHY };
}
type WbDraft = { kind: WbAssumption["kind"]; statement: string; quote: string; statedBy: string | null };
const wbFrom = (id: string, d: WbDraft): WbAssumption => ({
  ...WB_WHY.assumptions[1],
  id,
  kind: d.kind,
  statement: d.statement.trim(),
  quote: d.quote.trim() || null,
  stated_by: d.statedBy ? { user_id: d.statedBy, name: WB_MEMBERS.find((m) => m.id === d.statedBy)?.name ?? "Someone" } : null,
  source: "owner",
});
export async function addAssumption(_decisionId: string, d: WbDraft) {
  return { ok: true as const, data: wbFrom("a9999999-9999-4999-8999-999999999999", d) };
}
export async function editAssumption(id: string, d: WbDraft) {
  return { ok: true as const, data: wbFrom(id, d) };
}
export async function removeAssumption() {
  return { ok: true as const };
}
export async function reconfirmAssumption(id: string, note: string) {
  const a = WB_WHY.assumptions.find((x) => x.id === id)!;
  return { ok: true as const, data: { ...a, status: "watching" as const, open_break: null, reconfirmed_at: "2026-11-11T10:00:00Z", reconfirm_note: note } };
}
export async function reopenDecision() {
  return { ok: true as const, data: { ...WB_WHY, reopened: { at: "2026-11-11T10:00:00Z", by: WB_WHY.owner, note: null } } };
}
export async function readRevisitSlot() {
  return { ok: true as const, data: WB_SLOT };
}
export async function bookRevisit() {
  return { ok: true as const, data: { meeting_id: "99999999-9999-4999-8999-999999999999", start: WB_SLOT.start, end: WB_SLOT.end, title: WB_SLOT.title } };
}
export async function loadWhyMembers() {
  return { ok: true as const, data: WB_MEMBERS };
}
export async function readBlastRadius() {
  return { ok: true as const, data: WB_BLAST };
}
export async function readMeetingBlastRadius() {
  return { ok: true as const, data: WB_MEETING_BLAST };
}
let wbThread: WbSettlement = WB_SETTLEMENT;
export async function readSettlement() {
  return { ok: true as const, data: wbThread };
}
export async function sendSettleMessage(_id: string, body: string) {
  wbThread = { ...wbThread, messages: [...wbThread.messages, { id: `m${wbThread.messages.length + 1}`, author: { user_id: "u-sarah", name: "Sarah Okafor" }, mine: true, body, created_at: "2026-11-11T10:00:00Z" }] };
  return { ok: true as const, data: wbThread };
}
export async function shareSettleWording() {
  wbThread = { ...wbThread, mine: { ...wbThread.mine, shared: true } };
  return { ok: true as const, data: wbThread };
}
export async function keepBothDecisions(_id: string, note: string) {
  return { ok: true as const, data: { ...wbThread, status: "kept_both" as const, resolution: { by: { user_id: "u-sarah", name: "Sarah Okafor" }, at: "2026-11-11T10:00:00Z", note, winner_decision_id: null, meeting_id: null } } };
}
export async function supersedeDecision(_id: string, winner: string) {
  if (winner === wbThread.mine.decision_id) return { ok: true as const, data: { ...wbThread, proposal: { winner_decision_id: winner, by_me: true, at: "2026-11-11T10:00:00Z" } } };
  return { ok: true as const, data: { ...wbThread, status: "superseded" as const, resolution: { by: { user_id: "u-sarah", name: "Sarah Okafor" }, at: "2026-11-11T10:00:00Z", note: null, winner_decision_id: winner, meeting_id: null } } };
}
export async function acceptSettleProposal() {
  return { ok: true as const, data: { ...wbThread, status: "superseded" as const, proposal: null, resolution: { by: { user_id: "u-sarah", name: "Sarah Okafor" }, at: "2026-11-11T10:00:00Z", note: null, winner_decision_id: wbThread.theirs.decision_id, meeting_id: null } } };
}
export async function declineSettleProposal() {
  return { ok: true as const, data: { ...wbThread, proposal: null } };
}
export async function readSettleSlot() {
  return { ok: true as const, data: { ...WB_SLOT, title: "Settle: SSO vendor and Northwind's login" } };
}
export async function bookSettleMeeting() {
  return { ok: true as const, data: { meeting_id: "99999999-9999-4999-8999-999999999999", start: WB_SLOT.start, end: WB_SLOT.end, title: "Settle: SSO vendor" } };
}

// In every meeting at once (src/app/actions/listening.ts), answered as core-api would.
const LISTEN_POSITIONS = [
  { id: "a1b2c3d4-0000-4000-8000-000000000001", topic: "Pricing", text: "No discount above 10% for SMB without finance.", created_at: "2026-11-01T09:00:00Z", updated_at: "2026-11-01T09:00:00Z" },
  { id: "a1b2c3d4-0000-4000-8000-000000000002", topic: "Hiring", text: "No new contractors this quarter.", created_at: "2026-11-01T09:00:00Z", updated_at: "2026-11-01T09:00:00Z" },
  { id: "a1b2c3d4-0000-4000-8000-000000000003", topic: null, text: "Our pricing page stays public.", created_at: "2026-11-01T09:00:00Z", updated_at: "2026-11-01T09:00:00Z" },
];
const LISTEN_VIEW = {
  id: "b1b2c3d4-0000-4000-8000-000000000009",
  meeting_id: "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  user_id: "u-priya",
  author_name: "Priya Nair",
  kind: "view",
  text: "Keep SMB at 10% off. 15% breaks the margin model.",
  status: "pending",
  decided_at: null,
  created_at: "2026-11-11T10:12:00Z",
  chat_text: "Priya's view: Keep SMB at 10% off. 15% breaks the margin model.",
};
const choiceOf = (meetingId: string, choice: string, source = "manual") => ({
  meeting_id: meetingId,
  choice,
  source,
  rule_id: null,
  attendance: choice === "agent_listens" ? "agent" : "live",
  agents_listening: choice === "agent_listens" ? 1 : 0,
});
export async function setAttendanceChoice(meetingId: string, choice: string) {
  return { ok: true as const, data: choiceOf(meetingId, choice) };
}
export async function clearAttendanceChoice(meetingId: string) {
  return { ok: true as const, data: choiceOf(meetingId, "attend", "default") };
}
export async function saveAttendanceRule(_id: string | null, input: Record<string, unknown>) {
  return { ok: true as const, data: { applied: 3, rule: { id: "r-new", position: 0, created_at: "", updated_at: "", template_name: null, ...input } } };
}
export async function deleteAttendanceRule() {
  return { ok: true as const, data: null };
}
export async function saveListeningPreferences(input: Record<string, unknown>) {
  return { ok: true as const, data: { ...input, interruptible_now: true, quiet_reason: null, quiet_until: null } };
}
export async function listPositions() {
  return { ok: true as const, data: LISTEN_POSITIONS };
}
export async function savePosition(id: string | null, input: { topic: string | null; text: string }) {
  return { ok: true as const, data: { id: id ?? `p-${Date.now()}`, created_at: "", updated_at: "", ...input } };
}
export async function deletePosition() {
  return { ok: true as const, data: null };
}
export async function joinFromInterruption(id: string) {
  return { ok: true as const, data: { id, join_url: "/meetings/x/room", response: "joined", can_respond: false } };
}
export async function dismissInterruption(id: string) {
  return { ok: true as const, data: { id, response: "dismissed" } };
}
export async function sendView(_id: string, text: string) {
  return { ok: true as const, data: { ...LISTEN_VIEW, text } };
}
export async function holdTheLine() {
  return { ok: true as const, data: { ...LISTEN_VIEW, kind: "hold_line" } };
}
export async function loadMeetingViews() {
  return { ok: true as const, data: { items: [LISTEN_VIEW], is_host: true } };
}
export async function decideMeetingView(_m: string, viewId: string, verdict: string) {
  return { ok: true as const, data: { ...LISTEN_VIEW, id: viewId, status: verdict === "share" ? "shared" : "dismissed" } };
}

// Decisions as bets and the company time machine (b1): answered as core-api would.
export async function saveBet(_decisionId: string, body: Record<string, unknown>) {
  return { ok: true as const, view: betView({ ...BET, ...(body as object), status: "open" } as typeof BET) };
}
export async function stepBet(_decisionId: string, step: string) {
  const status = step === "dismiss" ? "dismissed" : step === "restore" ? "proposed" : step === "reopen" ? "due" : "open";
  return { ok: true as const, view: betView({ ...BET, status } as typeof BET) };
}
export async function resolveBet(_decisionId: string, input: { outcome: "hit" | "partly" | "missed"; assumption_held: boolean | null; lesson: string }) {
  return {
    ok: true as const,
    view: betView({ ...BET, status: "resolved", outcome: input.outcome, assumption_held: input.assumption_held, lesson: input.lesson || null, resolved_at: "2026-11-11T10:00:00Z", resolved_by_name: "Maya Patel" }),
  };
}
export async function loadBetHints() {
  return betView(null).hints;
}
export async function loadSnapshot(asOf: string, topic?: string) {
  return { ok: true as const, data: { ...SNAPSHOT, as_of: asOf, topic: topic || null } };
}
export async function loadDiff(from: string, to: string, topic?: string) {
  return { ok: true as const, data: { ...DIFF, from, to, topic: topic || null } };
}
export async function loadTimeline(topic: string) {
  return { ok: true as const, data: { ...TIMELINE, topic } };
}
export * from "./actions-skel-home";
export * from "./actions-skel-meet";
export * from "./actions-skel-people";
export * from "./actions-skel-work";
// Settings > Profile (faces screenshots): saves succeed without a backend.
export async function refreshMyProfile(): Promise<void> {}
export async function saveDisplayName(): Promise<boolean> {
  return true;
}
export async function saveWorkingProfile() {
  return { ok: true as const };
}

// Settings > Integrations: Connect and Disconnect are form actions (React 18 cannot run them; the
// spec checks the form's fields instead).
export async function connectProvider(_formData: FormData) {}
export async function disconnectProvider(_formData: FormData) {}
// Meeting invitations (ADR-0043). `window.__emailConfigured` (default true) answers the New meeting
// window's check; `window.__invitesRead` is what the card's Retry reads back; `window.__inviteFail`
// makes a send fail as core-api's 429 would.
type InviteWindow = { __emailConfigured?: boolean | null; __invitesRead?: unknown; __inviteFail?: boolean; __invitesSent?: string[][] };
const iw = () => window as unknown as InviteWindow;
export async function invitationEmailStatus() {
  return iw().__emailConfigured === undefined ? true : iw().__emailConfigured;
}
export async function loadInvitations() {
  return (iw().__invitesRead as { ok: true } | undefined) ?? { ok: false as const, status: 503 };
}
export async function sendInvitations(_meetingId: string, userIds: string[]) {
  (iw().__invitesSent ??= []).push(userIds);
  if (iw().__inviteFail) return { ok: false as const, message: "That's a lot of invitations for one meeting. Try again in an hour." };
  const configured = iw().__emailConfigured !== false;
  const now = new Date().toISOString();
  return {
    ok: true as const,
    result: {
      email_configured: configured,
      invitations: userIds.map((id) => ({
        id: `inv-${id}`,
        email: `${id.replace("u-", "")}@example.com`,
        user_id: id,
        name: id.replace("u-", "").replace(/^./, (c) => c.toUpperCase()),
        status: configured ? ("sent" as const) : ("not_configured" as const),
        last_error: null,
        last_kind: "invite" as const,
        send_count: 1,
        sent_at: configured ? now : null,
        invited_by: "u-maya",
        created_at: now,
        updated_at: now,
      })),
      sent: configured ? userIds.length : 0,
      failed: 0,
      not_configured: configured ? 0 : userIds.length,
      participants_added: userIds.length,
    },
  };
}

/* Ops console (WorkspacePanel): not exercised by CT specs; present so the bundle builds. */
export async function loadTenantDetail(_orgId: string) {
  return { ok: false as const, message: "Not available in the component harness." };
}
export async function listSupportMembers(_orgId: string) {
  return { ok: true as const, members: [] as { id: string; name: string; email: string }[] };
}
export async function beginSupportSession(..._args: unknown[]) {
  return { ok: false as const, message: "Not available in the component harness." };
}
export async function finishSupportSession(..._args: unknown[]) {
  return { ok: true as const };
}
export async function cancelTenantMove(..._args: unknown[]) {
  return { ok: true as const };
}
export async function requestTenantMove(..._args: unknown[]) {
  return { ok: false as const, message: "Not available in the component harness." };
}

/* ---------------- Ask Myte (ADR-0047) ---------------- */
import { MENTIONS as ASK_MENTIONS, STARTERS as ASK_STARTERS, THREAD as ASK_THREAD, THREADS as ASK_THREADS } from "../ask-myte-fixture";
const aw = () => window as unknown as { __askConfirmed?: unknown[]; __askFeedback?: unknown[] };
export async function listMyteThreads() {
  return { ok: true as const, list: ASK_THREADS };
}
export async function getMyteThread() {
  return { ok: true as const, thread: ASK_THREAD };
}
export async function renameMyteThread(id: string, title: string) {
  return { ok: true as const, thread: { ...ASK_THREADS.items.find((t) => t.id === id)!, title } };
}
export async function pinMyteThread(id: string, pinned: boolean) {
  return { ok: true as const, thread: { ...ASK_THREADS.items.find((t) => t.id === id)!, pinned } };
}
export async function deleteMyteThread() {
  return { ok: true as const };
}
export async function deleteAllMyteThreads() {
  return { ok: true as const };
}
export async function sendMyteFeedback(id: string, feedback: number, reason: string | null) {
  (aw().__askFeedback ??= []).push({ id, feedback, reason });
  return { ok: true as const, message: { id } };
}
export async function myteStarters() {
  return ASK_STARTERS.slice(0, 3);
}
export async function myteMentions() {
  return ASK_MENTIONS;
}
export async function confirmMyteProposal(proposal: { kind: string; title: string }, edits: unknown) {
  (aw().__askConfirmed ??= []).push({ proposal, edits });
  return { ok: true as const, done: "Task added", href: "/work/tasks" };
}
// The workspace logo editor (ADR-0047). `window.__logoUpload` steers a test: "slow" holds the
// upload long enough to see the progress state, "refuse" answers as the API does for a 429.
export async function uploadOrgLogo(_form: FormData) {
  const mode = (globalThis as { __logoUpload?: string }).__logoUpload;
  await new Promise((r) => setTimeout(r, mode === "slow" ? 60_000 : 300));
  if (mode === "refuse") return { ok: false as const, message: "The logo has been changed too many times this hour. Try again later." };
  return { ok: true as const, logoUrl: "/api/v1/org/logo/image?v=2" };
}
export async function removeOrgLogo() {
  return { ok: true as const, logoUrl: null };
}
// The workspace chooser hands a chosen workspace to the API; nothing to provision in a test.
export async function provisionActiveWorkspace() {
  return { ok: true as const };
}
