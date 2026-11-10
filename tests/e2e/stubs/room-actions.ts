// The room's own server actions (components/room/actions.ts), with an empty ledger and history.
export async function loadCandidateLedger() {
  return { ok: true as const, decisions: [], actions: [] };
}
export async function loadChatHistory() {
  return {
    ok: true as const,
    items: [
      { id: "row-1", user_id: "u-raj", content: "Morning all, notes doc is in the invite.", created_at: "2026-11-11T09:58:00Z" },
    ],
  };
}
export async function endMeetingForEveryone() {
  return { ok: true as const };
}
