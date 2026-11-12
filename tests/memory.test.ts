// Run: npm test
// "What your agent remembers" (Settings > Agent memory) and the wave 3 follow-ups that share
// pure helpers: the erasure checklist and the ask citation anchors.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  agentName,
  applyUpdate,
  askedLabel,
  calibrationSentence,
  cleanTopicLabel,
  forgotten,
  isEmptyMemory,
  sortTopics,
  thresholdLabel,
  topicStrength,
  type PersonMemory,
} from "../src/lib/memory.ts";
import { anyInProgress, erasureProgress, orderedStores, storeLabel } from "../src/lib/erasure.ts";
import { askCitationHref, askCitationInline, askCitationMeta, askCitationTime } from "../src/lib/rag/ask-live.ts";

const topic = (label: string, weight: number, pinned = false) => ({ label, weight, mentions: 2, pinned, last_seen_at: null });

const memory = (over: Partial<PersonMemory> = {}): PersonMemory => ({
  learning_enabled: true,
  topics: [topic("Pricing", 2.5), topic("Hiring", 0.4), topic("Project Falcon", 1, true)],
  recurring_questions: [{ text: "When does the beta ship?", count: 3, last_at: null }],
  muted_topics: ["Lunch"],
  open_actions: [],
  open_promises: [],
  calibration: [],
  updated_at: "2026-11-10T09:00:00Z",
  ...over,
});

test("calibration reads as a plain sentence", () => {
  assert.equal(
    calibrationSentence({ agent: "PersonalListenerAgent", surface: 0.75, personal: true, samples: 10, dismissed: 4 }),
    "Your Myte shows notes above 0.75 because you dismissed 4 of the last 10.",
  );
  assert.equal(
    calibrationSentence({ agent: "QuestionAgent", surface: 0.65, personal: true, samples: 12, dismissed: 0 }),
    "Your Myte shows suggested questions above 0.65 because you kept all of the last 12.",
  );
  assert.equal(
    calibrationSentence({ agent: "ContextGapAgent", surface: 0.7, personal: false, samples: 7 }),
    "Your Myte shows context fills above 0.70, the workspace setting. It tunes to you after 1 more context fill you keep or dismiss.",
  );
  assert.equal(
    calibrationSentence({ agent: "PersonalListenerAgent", surface: 0.7, personal: false, samples: 0 }),
    "Your Myte shows notes above 0.70, the workspace setting. It tunes to you after 8 more notes you keep or dismiss.",
  );
  assert.equal(thresholdLabel(1.4), "1.00");
  assert.equal(agentName("QuestionAgent"), "Suggested questions");
  assert.equal(agentName("FutureThingAgent"), "Future Thing");
});

test("topics: pinned first, then strength; strength is relative to the strongest", () => {
  assert.deepEqual(sortTopics(memory().topics).map((t) => t.label), ["Project Falcon", "Pricing", "Hiring"]);
  assert.deepEqual(topicStrength(topic("Pricing", 2.5), 2.5), { share: 1, label: "Strong" });
  assert.equal(topicStrength(topic("Hiring", 0.4), 2.5).label, "Fading");
  assert.equal(topicStrength(topic("x", 1, true), 2.5).label, "Pinned");
  assert.ok(topicStrength(topic("tiny", 0.0001), 2.5).share >= 0.06);
});

test("a typed topic is cleaned, and an already pinned one is refused", () => {
  assert.equal(cleanTopicLabel("  Q4   launch  ", []), "Q4 launch");
  assert.equal(cleanTopicLabel("project falcon", memory().topics), null);
  assert.equal(cleanTopicLabel("   ", []), null);
  assert.equal(cleanTopicLabel("x".repeat(200), [])?.length, 80);
});

test("an update applies as the server will: forget mutes, unmute, pin, forget a question", () => {
  const m = memory();
  const forgot = applyUpdate(m, { forget_topics: ["pricing"] });
  assert.deepEqual(forgot.topics.map((t) => t.label), ["Hiring", "Project Falcon"]);
  assert.deepEqual(forgot.muted_topics, ["Lunch", "pricing"]);
  assert.deepEqual(applyUpdate(m, { unmute_topics: ["LUNCH"] }).muted_topics, []);
  const pinned = applyUpdate(m, { pin_topics: ["Hiring", "Lunch"] });
  assert.equal(pinned.topics.find((t) => t.label === "Hiring")?.pinned, true);
  assert.equal(pinned.topics.find((t) => t.label === "Lunch")?.pinned, true);
  assert.deepEqual(pinned.muted_topics, []);
  assert.deepEqual(applyUpdate(m, { forget_questions: ["When does the beta ship?"] }).recurring_questions, []);
  assert.equal(applyUpdate(m, { learning_enabled: false }).learning_enabled, false);
  assert.equal(m.topics.length, 3, "the input is not mutated");
});

test("forget everything keeps the switch and the live lists", () => {
  const after = forgotten(memory({ learning_enabled: false }));
  assert.equal(isEmptyMemory(after), true);
  assert.equal(after.learning_enabled, false);
  assert.equal(isEmptyMemory(memory()), false);
  assert.equal(askedLabel(1), "Asked once");
  assert.equal(askedLabel(2), "Asked twice");
  assert.equal(askedLabel(5), "Asked 5 times");
});

test("erasure progress per store", () => {
  const stores = [
    { store: "knowledge_graph", status: "pending" as const },
    { store: "core_api", status: "completed" as const, completed_at: "2026-11-11T10:00:00Z" },
    { store: "vectors", status: "completed" as const },
    { store: "transcript_chunks", status: "pending" as const },
    { store: "search_index", status: "pending" as const },
  ];
  assert.deepEqual(orderedStores(stores).map((s) => s.store), ["core_api", "transcript_chunks", "vectors", "search_index", "knowledge_graph"]);
  assert.deepEqual(erasureProgress({ progress: "in_progress", stores }), { done: 2, total: 5, finished: false, label: "2 of 5 stores done" });
  const all = stores.map((s) => ({ ...s, status: "completed" as const }));
  assert.equal(erasureProgress({ progress: "completed", stores: all }).label, "Finished in every store");
  assert.equal(erasureProgress({ progress: "completed", stores: [stores[1]] }).label, "Finished");
  assert.equal(storeLabel("transcript_chunks").name, "Transcripts");
  assert.equal(storeLabel("new_store").name, "new store");
  assert.equal(anyInProgress([{ progress: "completed" }, { progress: "in_progress" }]), true);
  assert.equal(anyInProgress([{ progress: "completed" }]), false);
});

test("ask citations: transcript seconds and document passages", () => {
  const M = "11111111-1111-4111-8111-111111111111";
  const D = "22222222-2222-4222-8222-222222222222";
  const line = { n: 1, text: "We agreed on May.", kind: "transcript", meeting_id: M, start_ms: 3_725_400, speaker: "Raj" };
  assert.equal(askCitationHref(line), `/meetings/${M}/transcript#t=3725`);
  assert.equal(askCitationTime(line), "1:02:05");
  assert.equal(askCitationTime({ ...line, start_ms: 754_200 }), "12:34");
  assert.equal(askCitationMeta({ ...line, start_ms: 754_200 }), "at 12:34, Raj");
  assert.equal(askCitationTime({ ...line, start_ms: -1 }), null);
  const doc = { n: 2, text: "Refunds within 30 days.", kind: "document", document_id: D };
  assert.equal(askCitationHref(doc), null);
  assert.equal(askCitationInline(doc), true);
  assert.equal(askCitationInline({ ...doc, text: " " }), false);
  assert.equal(askCitationInline(line), false);
});
