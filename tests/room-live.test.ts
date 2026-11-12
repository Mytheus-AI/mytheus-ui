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
    agentNameOf: (id) => `${id}'s Myte`,
  });
  assert.deepEqual(g.inCall.map((p) => p.id), ["raj", "me", "ann"], "hands first, then you");
  assert.equal(g.inCall[1].host, true);
  assert.deepEqual(g.agents.map((a) => a.name), ["Sarah"], "Ann sent her Myte but came after all");
  assert.deepEqual(g.absent.map((a) => a.name), ["Priya"]);
});

test("one honest connection line that clears itself", () => {
  assert.equal(roomConnection("connected", "joined", true), null);
  assert.equal(roomConnection("unconfigured", "disabled", false), null);
  assert.match(roomConnection("connected", "reconnecting", true)!.text, /Myte paused/);
  assert.match(roomConnection("connected", "connecting", true)!.text, /Myte paused/);
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

// UI polish pass: the hands queue, what the room says about a change, and lowering a hand once
// you have been speaking for a few seconds.
import {
  SPEAK_LOWER_MS,
  handAnnouncement,
  handChangeOf,
  handPlace,
  handWait,
  ordinal,
  quietSpeech,
  spokeLongEnough,
  stepSpeech,
} from "../src/lib/realtime/room-live.ts";
import { itemsFromText } from "../src/lib/agenda-quick-add.ts";

test("a hand keeps the gateway's raise time, and the queue is oldest first", () => {
  let s = applyHand(emptyHandsState, { userId: "raj", raised: true, at: "2026-11-11T10:00:05Z", raisedAt: "2026-11-11T10:00:01Z" });
  assert.equal(s.raised.raj, "2026-11-11T10:00:01Z");
  s = applyHand(s, { userId: "priya", raised: true, at: "2026-11-11T10:00:03Z" });
  assert.deepEqual(handQueue(s), ["raj", "priya"]);
  assert.equal(handPlace(s, "priya"), 2);
  assert.equal(handPlace(s, "maya"), 0);
  assert.equal(handPlace(s, null), 0);
  // A second raise without the gateway's time does not move anyone.
  assert.equal(applyHand(s, { userId: "raj", raised: true, at: "2026-11-11T11:00:00Z" }), s);
});

test("ordinals and calm wait times", () => {
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 103].map(ordinal), ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "103rd"]);
  const t = Date.parse("2026-11-11T10:10:00Z");
  assert.equal(handWait("2026-11-11T10:09:30Z", t), "just now");
  assert.equal(handWait("2026-11-11T10:07:59Z", t), "2 min");
  assert.equal(handWait("not a time", t), "just now");
});

test("a hand change is read from the gateway, older payloads included", () => {
  assert.deepEqual(handChangeOf({ userId: "raj", raised: false, byUserId: "maya", reason: "called" }, 4), {
    seq: 4,
    userId: "raj",
    raised: false,
    byUserId: "maya",
    reason: "called",
  });
  assert.equal(handChangeOf({ userId: "raj", raised: true }, 1)?.reason, "raised");
  assert.equal(handChangeOf({ userId: "raj", raised: false, reason: "weird" }, 1)?.reason, "lowered");
  assert.equal(handChangeOf({ raised: true }, 1), null);
});

test("what the room says: the host hears hands go up, you hear when you are called on", () => {
  const nameOf = (id: string) => ({ raj: "Raj Patel", maya: "Maya Chen" })[id] ?? "A teammate";
  const up = handChangeOf({ userId: "raj", raised: true }, 1)!;
  const host = handAnnouncement(up, { meId: "maya", steers: true, place: 2, count: 2, nameOf });
  assert.equal(host.live, "Raj Patel raised their hand, 2nd in line.");
  assert.deepEqual(host.toast, { text: "Raj Patel raised their hand, 2nd in line", tone: "info" });
  assert.equal(handAnnouncement(up, { meId: "priya", steers: false, place: 2, count: 2, nameOf }).toast, null);

  const called = handChangeOf({ userId: "raj", raised: false, byUserId: "maya", reason: "called" }, 2)!;
  const toRaj = handAnnouncement(called, { meId: "raj", steers: false, place: 0, count: 1, nameOf });
  assert.equal(toRaj.live, "Maya Chen called on you. 1 hand up.");
  assert.deepEqual(toRaj.toast, { text: "Maya Chen called on you. Go ahead.", tone: "success" });
  assert.equal(handAnnouncement(called, { meId: "maya", steers: true, place: 0, count: 0, nameOf }).live, "You called on Raj Patel. No hands up.");

  const lowered = handChangeOf({ userId: "raj", raised: false, byUserId: "maya", reason: "lowered" }, 3)!;
  assert.deepEqual(handAnnouncement(lowered, { meId: "raj", steers: false, place: 0, count: 0, nameOf }).toast, {
    text: "Maya Chen lowered your hand",
    tone: "info",
  });
  const own = handChangeOf({ userId: "raj", raised: false, byUserId: "raj" }, 4)!;
  assert.equal(handAnnouncement(own, { meId: "raj", steers: false, place: 0, count: 0, nameOf }).toast, null);
  const spoke = handChangeOf({ userId: "raj", raised: false, reason: "spoke" }, 5)!;
  assert.match(handAnnouncement(spoke, { meId: "maya", steers: true, place: 0, count: 0, nameOf }).live, /started speaking/);
});

test("a hand comes down only after a few seconds of speech, pauses between words included", () => {
  let run = quietSpeech;
  run = stepSpeech(run, true, 0);
  run = stepSpeech(run, false, 900); // a pause between words
  run = stepSpeech(run, true, 1500);
  assert.equal(spokeLongEnough(run, 1500), false);
  run = stepSpeech(run, true, SPEAK_LOWER_MS + 10);
  assert.equal(spokeLongEnough(run, SPEAK_LOWER_MS + 10), true);
  // Speech stops, and a long silence starts over.
  run = stepSpeech(run, false, SPEAK_LOWER_MS + 20);
  run = stepSpeech(run, false, SPEAK_LOWER_MS + 2000);
  assert.deepEqual(run, quietSpeech);
  run = stepSpeech(run, true, 10_000);
  assert.equal(spokeLongEnough(run, 10_500), false, "a cough is not the floor");
});

test("Add agenda reads one item per line, pasted bullets and numbers included", () => {
  assert.deepEqual(itemsFromText("Beta readiness\n\n- Launch date\n2) Pricing\n  * Hiring  \n• Wrap"), [
    "Beta readiness",
    "Launch date",
    "Pricing",
    "Hiring",
    "Wrap",
  ]);
  assert.deepEqual(itemsFromText("   \n"), []);
});
