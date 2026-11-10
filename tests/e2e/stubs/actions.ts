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
