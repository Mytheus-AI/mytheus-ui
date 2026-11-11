import type { Interruption } from "../../src/lib/api/listening-types";

/* Fixed data for the In every meeting at once harness and specs (kept out of the harness module:
   component testing mounts only components from it). */

export const M = (n: number) => `8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c${String(n).padStart(2, "0")}`;

export const INTERRUPTION: Interruption = {
  id: "e1e2e3d4-0000-4000-8000-000000000001",
  meeting_id: M(3),
  meeting_title: "Pricing review",
  meeting_status: "live",
  scheduled_start: "2026-11-11T15:00:00Z",
  reason: "decision",
  title: "Pricing for your segment is being decided in the 3pm right now.",
  headline: "Pricing for your segment is being decided",
  detail: "They are settling the SMB discount floor.",
  topic: "pricing",
  quote: "Let's lock the SMB tier at 15% off and revisit in March.",
  start_ms: 125_000,
  status: "delivered",
  held_reason: null,
  response: null,
  responded_at: null,
  created_at: "2026-11-11T15:02:00Z",
  join_url: `/meetings/${M(3)}/room`,
  moment_url: `/meetings/${M(3)}/transcript#t=125`,
  can_respond: true,
};
