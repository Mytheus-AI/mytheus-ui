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
