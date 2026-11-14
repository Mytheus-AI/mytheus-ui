// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  citedIn,
  failAnswer,
  faceState,
  faceWords,
  fallbackTitle,
  fromStored,
  historyFrom,
  isSlow,
  newAnswer,
  plainText,
  reduceAnswer,
  setProposalStatus,
  stopAnswer,
  titleFrom,
  toPayload,
  type Answer,
} from "../src/lib/ask-myte/reducer.ts";
import type { StreamEvent } from "../src/lib/ask-myte/types.ts";

const run = (events: StreamEvent[], start = newAnswer("a1", 1000)): Answer =>
  events.reduce((a, ev, i) => reduceAnswer(a, ev, 2000 + i), start);

const M = "11111111-1111-4111-8111-111111111111";

test("a full answer: steps, sources, text, cards, a proposal, follow-ups, done, saved", () => {
  const a = run([
    { event: "step", data: { id: "step-1", label: "Found the meeting", state: "running" } },
    { event: "step", data: { id: "step-2", label: "Checked your tasks", state: "running" } },
    { event: "source", data: { n: 2, kind: "decision", title: "Meetings go live on join", text: "A meeting is live when a person joins." } },
    { event: "source", data: { n: 1, kind: "transcript", title: "Feature Update - Backend", text: "Let's drop Drive.", meeting_id: M, start_ms: 674000 } },
    { event: "step", data: { id: "step-1", label: "Found the meeting", state: "done" } },
    { event: "delta", data: { text: "Two decisions were confirmed [1]" } },
    { event: "delta", data: { text: " and [2]." } },
    { event: "card", data: { kind: "decision", source_ns: [2], data: { items: [], detail: null } } },
    { event: "proposal", data: { id: "p1", kind: "task", title: "Upload the logo", due_date: "2026-11-16" } },
    { event: "followups", data: { items: ["Who else was there?", " ", "What's left?", "Draft a recap", "extra"] } },
    { event: "title", data: { text: "Backend update" } },
    { event: "done", data: { abstained: false, degraded: false, cited: [1, 2] } },
    { event: "saved", data: { thread_id: "t1", message_ids: ["u1", "m1"] } },
  ]);
  assert.equal(a.status, "done");
  assert.equal(a.text, "Two decisions were confirmed [1] and [2].");
  assert.equal(a.firstTextAt, 2005);
  assert.deepEqual(a.sources.map((s) => s.n), [1, 2]);
  assert.deepEqual(a.steps.map((s) => s.state), ["done", "done"], "a step left running is closed by done");
  assert.equal(a.cards.length, 1);
  assert.equal(a.proposals[0].status, "open");
  assert.deepEqual(a.followups, ["Who else was there?", "What's left?", "Draft a recap"]);
  assert.deepEqual(a.cited, [1, 2]);
  assert.equal(a.id, "m1");
  assert.equal(a.saved, true);
});

test("an error closes running steps as failed and keeps the text", () => {
  const a = run([
    { event: "step", data: { id: "step-1", label: "Looking", state: "running" } },
    { event: "delta", data: { text: "Partly" } },
    { event: "error", data: { reason: "budget", message: "Back on Dec 1" } },
    { event: "delta", data: { text: " ignored" } },
  ]);
  assert.equal(a.status, "error");
  assert.equal(a.text, "Partly");
  assert.deepEqual(a.error, { reason: "budget", message: "Back on Dec 1" });
  assert.equal(a.steps[0].state, "failed");
});

test("stop keeps what streamed; fail marks offline; neither touches a settled answer", () => {
  const streaming = run([{ event: "delta", data: { text: "So far" } }]);
  const stopped = stopAnswer(streaming);
  assert.equal(stopped.status, "stopped");
  assert.equal(stopped.text, "So far");
  assert.equal(stopAnswer(stopped), stopped);
  const offline = failAnswer(streaming, "offline");
  assert.equal(offline.error?.reason, "offline");
  assert.equal(failAnswer(stopped, "offline"), stopped);
});

test("unsaved after done marks it unsaved", () => {
  const a = run([
    { event: "done", data: { abstained: true, degraded: false, cited: [] } },
    { event: "unsaved", data: { message: "x" } },
  ]);
  assert.equal(a.abstained, true);
  assert.equal(a.saved, false);
});

test("malformed events are ignored", () => {
  const a = run([
    { event: "source", data: { n: 0, kind: "x", title: "", text: "" } },
    { event: "step", data: { label: "no id" } as never },
    { event: "proposal", data: { id: 3 } as never },
  ]);
  assert.equal(a.sources.length + a.steps.length + a.proposals.length, 0);
});

test("the face: happy, then reading, then streaming state, then typing, else idle", () => {
  const streaming = { status: "streaming" as const, text: "" };
  assert.equal(faceState({ answer: streaming, typing: true, reading: false, happy: true }), "happy");
  assert.equal(faceState({ answer: null, typing: false, reading: true, happy: false }), "speaking");
  assert.equal(faceState({ answer: streaming, typing: true, reading: false, happy: false }), "thinking");
  assert.equal(faceState({ answer: { status: "streaming", text: "Hi" }, typing: false, reading: false, happy: false }), "speaking");
  assert.equal(faceState({ answer: { status: "done", text: "Hi" }, typing: true, reading: false, happy: false }), "listening");
  assert.equal(faceState({ answer: { status: "done", text: "Hi" }, typing: false, reading: false, happy: false }), "idle");
  assert.equal(faceWords("thinking", "Pip"), "Pip is looking");
});

test("slow after 8 seconds with nothing to read", () => {
  const a = newAnswer("a", 0);
  assert.equal(isSlow(a, 7999), false);
  assert.equal(isSlow(a, 8000), true);
  assert.equal(isSlow({ ...a, text: "x" }, 9000), false);
  assert.equal(isSlow({ ...a, status: "done" }, 9000), false);
});

test("titles", () => {
  assert.equal(titleFrom([{ event: "delta", data: { text: "x" } }, { event: "title", data: { text: "  Prep for Test " } }]), "Prep for Test");
  assert.equal(titleFrom([]), null);
  assert.equal(fallbackTitle("What did we decide?"), "What did we decide?");
  const long = fallbackTitle("What did we decide in the Feature Update backend meeting about Google Drive access and calendar");
  assert.ok(long.length <= 64 && long.endsWith("..."));
});

test("payload round trip, with confirmed proposals", () => {
  let a = run([
    { event: "source", data: { n: 1, kind: "action", title: "Reconnect Calendar", text: "Due Friday" } },
    { event: "proposal", data: { id: "p1", kind: "task", title: "Upload the logo" } },
    { event: "delta", data: { text: "One thing [1]." } },
    { event: "done", data: { abstained: false, degraded: true, cited: [1] } },
  ]);
  a = setProposalStatus(a, "p1", "confirmed", { title: "Upload the Mytheus logo" });
  const payload = toPayload(a);
  assert.equal(payload.proposals?.[0].confirmed, true);
  const back = fromStored({ id: "m1", thread_id: "t", role: "myte", content: a.text, payload, feedback: 1, feedback_reason: null, created_at: "" });
  assert.equal(back.role, "myte");
  if (back.role !== "myte") return;
  assert.equal(back.proposals[0].status, "confirmed");
  assert.equal(back.proposals[0].title, "Upload the Mytheus logo");
  assert.equal(back.degraded, true);
  assert.equal(back.feedback, 1);
});

test("payload stays under 64 KB by cutting passages", () => {
  const big = "word ".repeat(4000);
  const events: StreamEvent[] = Array.from({ length: 20 }, (_, i) => ({ event: "source" as const, data: { n: i + 1, kind: "transcript", title: "t", text: big } }));
  const payload = toPayload(run(events));
  assert.ok(new TextEncoder().encode(JSON.stringify(payload)).length <= 64 * 1024);
  assert.equal(payload.sources?.length, 20);
});

test("history: the last 12 finished turns", () => {
  const msgs = Array.from({ length: 20 }, (_, i) => ({
    id: `m${i}`,
    thread_id: "t",
    role: (i % 2 ? "myte" : "user") as "myte" | "user",
    content: `turn ${i}`,
    payload: null,
    feedback: null,
    feedback_reason: null,
    created_at: "",
  }));
  const h = historyFrom(msgs);
  assert.equal(h.length, 12);
  assert.equal(h[11].content, "turn 19");
  const live = historyFrom([{ key: "q", role: "user", id: null, text: "q", scope: null }, newAnswer("a", 0)]);
  assert.deepEqual(live, [{ role: "user", content: "q" }]);
});

test("plain text and citations", () => {
  assert.equal(plainText("Two decisions [1]. Drive is out [2] [3]."), "Two decisions. Drive is out.");
  assert.deepEqual(citedIn("a [2] b [1] c [2] d [9]", [{ n: 1 }, { n: 2 }]), [2, 1]);
});
