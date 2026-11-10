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
