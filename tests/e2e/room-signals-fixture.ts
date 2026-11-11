import type { ResumePoint } from "../../src/lib/api/room-signals-types";

/* The open thread a room opens with, shared by the harness and the room test (a3 room signals). */
export const RESUME: ResumePoint = {
  id: "9f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b",
  meeting_id: "44444444-4444-4444-8444-444444444444",
  meeting_title: "Platform sync",
  meeting_ended_at: "2026-11-10T10:00:00Z",
  reason: "cut_off",
  topic: "the migration risk",
  headline: "Raj was halfway through explaining the migration risk",
  positions: [
    { user_id: "u-maya", name: "Maya", quote: "We can move the billing tables in January, before the price change.", start_ms: 100_000, end_ms: 104_000 },
    { user_id: "u-diego", name: "Diego", quote: "Not before the audit closes, the old ledger still feeds finance.", start_ms: 110_000, end_ms: 113_000 },
  ],
  cut_off: { user_id: "u-raj", name: "Raj", quote: "The real risk is that the old ledger and the new one disagree for a", start_ms: 120_000, end_ms: 122_500 },
  agenda_item_id: null,
  status: "open",
  continued_in_meeting_id: null,
  created_at: "2026-11-10T10:01:00Z",
};
