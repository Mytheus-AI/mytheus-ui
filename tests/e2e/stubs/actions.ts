import { applyUpdate, forgotten, type MemoryUpdate, type PersonMemory } from "../../../src/lib/memory";
import { MEMORY_FIXTURE } from "../memory-fixture";
import { CAPACITY, CHECK_FULL, LEDGER, TODAY } from "../ledger-fixture";
import { addDays, type LedgerPromise } from "../../../src/lib/promises/ledger";

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
    return { ok: false as const, reason: "unavailable" as const, message: "Your agent could not answer just now. Try again in a moment." };
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
      consent_version: "room-notice-2026-11-11.2",
      current_version: "room-notice-2026-11-11.2",
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
