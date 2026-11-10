// Run: npm test
// Raise hand, reactions, the People panel, the honest connection line, the calmer spotlight,
// shortcuts that can be turned off and never fire while typing, and the meeting clock.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  REACTION_MS,
  applyHand,
  applyReaction,
  applyRoomHands,
  emptyHandsState,
  expireReactions,
  handQueue,
  peopleGroups,
} from "../src/lib/realtime/room-live.ts";
import { MAX_RECONNECT_ATTEMPTS, backoffMs, roomConnection } from "../src/lib/realtime/connection.ts";
import { HOLD_MS, emptySpotlight, stepSpotlight } from "../src/lib/realtime/spotlight.ts";
import { isTypingTarget, shortcutFor } from "../src/lib/realtime/shortcuts.ts";
import { elapsedSeconds, formatClock, spokenElapsed } from "../src/lib/realtime/meeting-clock.ts";
import { applyHostAgendaStatus, initialAgendaState } from "../src/lib/realtime/agenda.ts";

test("hands go up and down, queue in the order raised, and a snapshot replaces them", () => {
  let s = applyHand(emptyHandsState, { userId: "b", raised: true, at: "2026-11-11T10:00:02Z" });
  s = applyHand(s, { userId: "a", raised: true, at: "2026-11-11T10:00:01Z" });
  assert.deepEqual(handQueue(s), ["a", "b"]);
  s = applyHand(s, { userId: "a", raised: false });
  assert.deepEqual(handQueue(s), ["b"]);
  assert.deepEqual(handQueue(applyRoomHands([{ userId: "c", at: "2026-11-11T09:00:00Z" }])), ["c"]);
  assert.equal(applyHand(s, { userId: 1, raised: true }), s);
});

test("reactions float for a while, unknown ones and repeats are ignored", () => {
  let list = applyReaction([], { id: "r1", userId: "a", reaction: "clap" }, 0);
  list = applyReaction(list, { id: "r1", userId: "a", reaction: "clap" }, 10);
  list = applyReaction(list, { id: "r2", userId: "a", reaction: "<b>" }, 10);
  assert.equal(list.length, 1);
  assert.equal(expireReactions(list, REACTION_MS).length, 0);
});

test("the People panel lists the call, agents sent instead, and invited people not here", () => {
  const g = peopleGroups({
    inCall: [
      { id: "me", name: "Maya", isLocal: true, micOn: true },
      { id: "raj", name: "Raj", micOn: false },
      { id: "ann", name: "Ann", micOn: true },
    ],
    invitees: [
      { id: "me", role: "host", attendance: "live" },
      { id: "raj", role: null, attendance: "live" },
      { id: "sarah", role: null, attendance: "agent" },
      { id: "priya", role: null, attendance: "live" },
      { id: "ann", role: null, attendance: "agent" },
    ],
    hostId: "me",
    meId: "me",
    hands: applyHand(emptyHandsState, { userId: "raj", raised: true, at: "2026-11-11T10:00:00Z" }),
    nameOf: (id) => ({ sarah: "Sarah", priya: "Priya" })[id] ?? id,
    agentNameOf: (id) => `${id}'s agent`,
  });
  assert.deepEqual(g.inCall.map((p) => p.id), ["raj", "me", "ann"], "hands first, then you");
  assert.equal(g.inCall[1].host, true);
  assert.deepEqual(g.agents.map((a) => a.name), ["Sarah"], "Ann sent her agent but came after all");
  assert.deepEqual(g.absent.map((a) => a.name), ["Priya"]);
});

test("one honest connection line that clears itself", () => {
  assert.equal(roomConnection("connected", "joined", true), null);
  assert.equal(roomConnection("unconfigured", "disabled", false), null);
  assert.match(roomConnection("connected", "reconnecting", true)!.text, /Agent paused/);
  assert.match(roomConnection("connected", "connecting", true)!.text, /Agent paused/);
  assert.equal(roomConnection("connected", "connecting", false), null, "a first connect is not a drop");
  assert.match(roomConnection("reconnecting", "joined", true)!.text, /Call reconnecting/);
  assert.match(roomConnection("reconnecting", "reconnecting", true)!.text, /^Reconnecting/);
  const err = roomConnection("connected", "error", true)!;
  assert.equal(err.tone, "error");
  assert.equal(err.retry, "live");
  assert.equal(roomConnection("connected", "forbidden", false)!.retry, null);
});

test("reconnect backoff grows, is capped, and is jittered", () => {
  assert.equal(backoffMs(0, () => 0), 500);
  assert.equal(backoffMs(0, () => 1), 1000);
  assert.equal(backoffMs(3, () => 1), 8000);
  assert.equal(backoffMs(20, () => 1), 30_000);
  assert.ok(MAX_RECONNECT_ATTEMPTS >= 5);
});

test("the spotlight moves only after a new speaker holds the floor", () => {
  let s = stepSpotlight(emptySpotlight, ["a"], 0);
  assert.equal(s.current, "a");
  s = stepSpotlight(s, ["b"], 100); // a cough from b
  s = stepSpotlight(s, [], 300);
  assert.equal(s.current, "a");
  s = stepSpotlight(s, ["b"], 1000);
  s = stepSpotlight(s, ["b"], 1000 + HOLD_MS - 1);
  assert.equal(s.current, "a");
  s = stepSpotlight(s, ["b"], 1000 + HOLD_MS);
  assert.equal(s.current, "b");
  s = stepSpotlight(s, ["a", "b"], 5000);
  assert.equal(s.current, "b", "the current speaker keeps it while still speaking");
});

test("shortcuts can be turned off and never fire while typing or with a modifier", () => {
  assert.equal(shortcutFor({ key: "m" }, { tagName: "BUTTON" }, true), "mic");
  assert.equal(shortcutFor({ key: "M" }, { tagName: "DIV" }, true), "mic");
  assert.equal(shortcutFor({ key: "m" }, { tagName: "BUTTON" }, false), null);
  assert.equal(shortcutFor({ key: "m" }, { tagName: "INPUT", type: "text" }, true), null);
  assert.equal(shortcutFor({ key: "m" }, { tagName: "TEXTAREA" }, true), null);
  assert.equal(shortcutFor({ key: "m" }, { tagName: "DIV", isContentEditable: true }, true), null);
  assert.equal(shortcutFor({ key: "m", ctrlKey: true }, { tagName: "DIV" }, true), null);
  assert.equal(shortcutFor({ key: "x" }, { tagName: "DIV" }, true), null);
  assert.equal(isTypingTarget({ tagName: "INPUT", type: "checkbox" }), false);
  assert.equal(isTypingTarget({ tagName: "DIV", role: "textbox" }), true);
});

test("the clock counts from the meeting's start, the same for everyone", () => {
  assert.equal(elapsedSeconds("2026-11-11T10:00:00Z", Date.parse("2026-11-11T10:12:30Z")), 750);
  assert.equal(elapsedSeconds("2026-11-11T10:00:00Z", Date.parse("2026-11-11T09:59:00Z")), 0);
  assert.equal(elapsedSeconds(null, 0), null);
  assert.equal(formatClock(3725), "01:02:05");
  assert.equal(spokenElapsed(3840), "1 hour 4 minutes in");
});

test("a host agenda change from the room applies to everyone, keeping position", () => {
  const item = {
    id: "11111111-1111-4111-8111-111111111111",
    position: 2,
    title: "Budget",
    owner_user_id: null,
    duration_minutes: 10,
    status: "pending",
    status_source: null,
    agent_note: null,
  } as never;
  const s = initialAgendaState([item]);
  const next = applyHostAgendaStatus(s, { ...(item as object), status: "covered", position: 0 } as never);
  assert.equal(next.items[0].status, "covered");
  assert.equal(next.items[0].status_source, "host");
  assert.equal(next.items[0].position, 2);
});
