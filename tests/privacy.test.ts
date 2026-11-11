// Run: npm test
// Off the record and live caption translation (polish program wave 3): the pure reducers the room
// renders from.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CAPTION_LANGUAGES,
  applyOffRecord,
  applyRequest,
  applyTranslation,
  chooseLanguage,
  gapLength,
  initialOffRecord,
  initialTranslation,
  isCaptionLanguage,
  settleRequest,
} from "../src/lib/realtime/privacy.ts";

test("off the record follows the server's state and remembers who changed it", () => {
  const joined = applyOffRecord(initialOffRecord, { active: false, at: "t0" });
  assert.equal(joined.known, true);
  assert.equal(joined.lastChange, null, "the first state on join is not a change anyone made");

  const off = applyOffRecord(joined, {
    active: true,
    segmentId: "s1",
    startedAt: "2026-11-11T12:04:00Z",
    startedBy: "u-maya",
    requestedBy: "u-raj",
    byUserId: "u-maya",
    at: "t1",
  });
  assert.equal(off.active, true);
  assert.equal(off.since, "2026-11-11T12:04:00Z");
  assert.equal(off.requestedBy, "u-raj");
  assert.deepEqual(off.lastChange, { active: true, by: "u-maya", at: "t1" });

  // The same state again (the room echo of the host's own change) is not a second change.
  const echo = applyOffRecord(off, { active: true, segmentId: "s1", startedAt: "2026-11-11T12:04:00Z", byUserId: "u-maya", at: "t2" });
  assert.equal(echo.lastChange, off.lastChange);

  const back = applyOffRecord(echo, { active: false, endedBy: "u-maya", at: "t3" });
  assert.equal(back.active, false);
  assert.equal(back.since, null);
  assert.deepEqual(back.lastChange, { active: false, by: "u-maya", at: "t3" });

  assert.equal(applyOffRecord(back, { active: "yes" as unknown as boolean }), back, "a malformed payload changes nothing");
});

test("requests: one per person, settled by an answer", () => {
  let r = applyRequest([], { userId: "u-raj", at: "a" });
  r = applyRequest(r, { userId: "u-priya", at: "b" });
  r = applyRequest(r, { userId: "u-raj", at: "c" });
  assert.deepEqual(
    r.map((x) => x.userId),
    ["u-priya", "u-raj"],
  );
  assert.deepEqual(settleRequest(r, "u-raj").map((x) => x.userId), ["u-priya"]);
  assert.equal(applyRequest(r, {}), r);
});

test("a gap reads in minutes", () => {
  assert.equal(gapLength(null), "under a minute");
  assert.equal(gapLength(30_000), "under a minute");
  assert.equal(gapLength(4 * 60_000 + 10_000), "4 min");
  assert.equal(gapLength(72 * 60_000), "1 h 12 min");
  assert.equal(gapLength(120 * 60_000), "2 h");
});

test("translations: only the chosen language, a switch starts clean, notices are calm", () => {
  assert.equal(CAPTION_LANGUAGES.length, 12);
  assert.equal(isCaptionLanguage("es"), true);
  assert.equal(isCaptionLanguage("xx"), false);

  // Nothing chosen: nothing is kept.
  assert.equal(applyTranslation(initialTranslation, { chunkId: "c1", language: "es", status: "translated", text: "Hola" }), initialTranslation);

  let t = chooseLanguage(initialTranslation, "es");
  t = applyTranslation(t, { chunkId: "c1", language: "fr", status: "translated", text: "Bonjour" });
  assert.deepEqual(t.byChunk, {}, "another language is not this viewer's");
  t = applyTranslation(t, { chunkId: "c1", language: "es", status: "translated", text: " Hola " });
  assert.deepEqual(t.byChunk, { c1: "Hola" });
  t = applyTranslation(t, { chunkId: "c2", language: "es", status: "translated", text: "  " });
  assert.equal(t.byChunk.c2, undefined, "an empty translation never blanks a line");

  t = applyTranslation(t, { chunkId: "c3", language: "es", status: "budget_denied" });
  assert.equal(t.notice, "budget_denied");
  t = applyTranslation(t, { chunkId: "c4", language: "es", status: "translated", text: "Sí" });
  assert.equal(t.notice, null, "a translation arriving again clears the notice");

  const switched = chooseLanguage(t, "de");
  assert.deepEqual(switched, { language: "de", byChunk: {}, notice: null });
  assert.equal(chooseLanguage(switched, "de"), switched);
});
