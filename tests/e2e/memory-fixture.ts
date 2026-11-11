import type { PersonMemory } from "../../src/lib/memory";

/* One person's agent memory, as core-api's `GET /api/v1/me/memory` returns it. */
export const MEMORY_FIXTURE: PersonMemory = {
  learning_enabled: true,
  topics: [
    { label: "Pricing", weight: 2.4, mentions: 6, pinned: false, last_seen_at: "2026-11-09T15:00:00Z" },
    { label: "Project Falcon", weight: 1, mentions: 0, pinned: true, last_seen_at: null },
    { label: "Hiring plan", weight: 0.5, mentions: 2, pinned: false, last_seen_at: "2026-10-30T15:00:00Z" },
  ],
  recurring_questions: [
    { text: "When does the beta ship?", count: 3, last_at: "2026-11-08T10:00:00Z" },
    { text: "Who owns the onboarding redesign?", count: 2, last_at: "2026-11-02T10:00:00Z" },
  ],
  muted_topics: ["Lunch orders"],
  open_actions: [{ id: "a1111111-1111-4111-8111-111111111111", content: "Send the pricing deck to Priya", due_date: "2026-11-14", meeting_id: "77777777-7777-4777-8777-777777777777" }],
  open_promises: [{ id: "b2222222-2222-4222-8222-222222222222", content: "Share the QA sign-off notes", due_hint: "by Friday", meeting_id: "77777777-7777-4777-8777-777777777777" }],
  calibration: [
    { agent: "ContextGapAgent", surface: 0.7, personal: false, samples: 3, dismissed: 1 },
    { agent: "PersonalListenerAgent", surface: 0.75, personal: true, samples: 10, dismissed: 4 },
    { agent: "QuestionAgent", surface: 0.65, personal: true, samples: 12, dismissed: 1 },
  ],
  updated_at: "2026-11-10T09:00:00Z",
};

export const EMPTY_MEMORY: PersonMemory = {
  learning_enabled: true,
  topics: [],
  recurring_questions: [],
  muted_topics: [],
  open_actions: [],
  open_promises: [],
  calibration: [
    { agent: "ContextGapAgent", surface: 0.7, personal: false, samples: 0, dismissed: 0 },
    { agent: "PersonalListenerAgent", surface: 0.7, personal: false, samples: 0, dismissed: 0 },
    { agent: "QuestionAgent", surface: 0.7, personal: false, samples: 0, dismissed: 0 },
  ],
  updated_at: null,
};
