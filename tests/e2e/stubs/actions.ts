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
        { n: 2, text: "Pro stays at 25 dollars a seat.", kind: "transcript", meeting_id: "44444444-4444-4444-8444-444444444444", meeting_title: "Pricing review", occurred_at: "2026-11-04T10:00:00Z", speaker: "Raj Patel" },
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
