// Run: npm test
// Talk mode's streaming speech segmenter: the first clause first, then sentences as they complete,
// markdown and citations stripped, unclosed code held back, nothing said twice or lost.
import assert from "node:assert/strict";
import { test } from "node:test";

import { cleanUnit, createSegmenter } from "../src/lib/voice/stream-text.ts";

/** Feed `text` in pieces of `step` characters, collecting what comes out (then finish). */
function stream(text: string, step = 3) {
  const seg = createSegmenter();
  const out: { at: number; unit: string }[] = [];
  for (let i = step; i < text.length + step; i += step) for (const unit of seg.feed(text.slice(0, i))) out.push({ at: Math.min(i, text.length), unit });
  for (const unit of seg.finish()) out.push({ at: -1, unit });
  return out;
}

const ANSWER =
  "Two decisions were confirmed on Thursday. Google Drive access is dropped, so Calendar is the only Google permission [1]. Meetings now go live only when someone joins [2].\n\nOne thing is on you: reconnect Google Calendar, due Friday [3].";

test("the first unit is the first clause, out before its sentence ends", () => {
  const seg = createSegmenter();
  assert.deepEqual(seg.feed("Your next meeting is the"), []);
  assert.deepEqual(seg.feed("Your next meeting is the Feature Update, at 3 pm"), ["Your next meeting is the Feature Update,"]);
  assert.deepEqual(seg.feed("Your next meeting is the Feature Update, at 3 pm with Samar."), []);
  assert.deepEqual(seg.feed("Your next meeting is the Feature Update, at 3 pm with Samar. Then"), ["at 3 pm with Samar."]);
  assert.deepEqual(seg.finish(), ["Then."]);
});

test("a short sentence is the first unit on its own; a tiny clause waits for more", () => {
  const seg = createSegmenter();
  assert.deepEqual(seg.feed("Yes, "), []);
  assert.deepEqual(seg.feed("Yes, you owe Raj the pricing draft. "), ["Yes, you owe Raj the pricing draft."]);
  const s2 = createSegmenter();
  assert.deepEqual(s2.feed("Done. "), ["Done."]);
});

test("a long opening with no punctuation is cut on a word near 60 characters, without a full stop", () => {
  const seg = createSegmenter();
  const text = "Your next meeting with Samar Rihan and Tomas Ferreira is the quarterly planning review on Thursday";
  const [u] = seg.feed(text);
  assert.ok(u, "something comes out");
  assert.ok(u!.length <= 60, u);
  assert.ok(!u!.endsWith("."), "a cut clause does not sound finished");
  assert.ok(text.startsWith(u!));
});

test("the whole answer streams out in order, citations and markdown stripped, nothing lost", () => {
  const out = stream(ANSWER);
  const units = out.map((o) => o.unit);
  assert.equal(units[0], "Two decisions were confirmed on Thursday.");
  assert.ok(units.every((u) => !/\[\d+\]/.test(u)), "no citations");
  const joined = units.join(" ");
  assert.equal(joined, "Two decisions were confirmed on Thursday. Google Drive access is dropped, so Calendar is the only Google permission. Meetings now go live only when someone joins. One thing is on you: reconnect Google Calendar, due Friday.");
  // every unit but possibly the last came out before the stream finished
  assert.ok(out.slice(0, -1).every((o) => o.at !== -1));
});

test("sentences that arrive together are joined (after the second unit), up to the limit", () => {
  const seg = createSegmenter();
  const text = "First one is here. Second one too. Third. Fourth. Fifth sentence ends it. ";
  const units = seg.feed(text);
  assert.deepEqual(units, ["First one is here.", "Second one too.", "Third. Fourth. Fifth sentence ends it."]);
});

test("markdown: lists, bold, headings and links read as plain sentences", () => {
  const out = stream("**Here is what you owe:**\n- Send Raj the [pricing draft](https://x.test/p)\n- Review *Maya's* notes\n\n## Next\nThat's all.", 4).map((o) => o.unit);
  assert.deepEqual(out, ["Here is what you owe:", "Send Raj the pricing draft.", "Review Maya's notes.", "Next.", "That's all."]);
});

test("an unclosed code fence is held back until it closes, and code is not read", () => {
  const seg = createSegmenter();
  assert.deepEqual(seg.feed("Run this. "), ["Run this."]);
  assert.deepEqual(seg.feed("Run this. ```\nnpm ci. And more."), []);
  assert.deepEqual(seg.feed("Run this. ```\nnpm ci. And more.\n``` Then it works. "), ["Then it works."]);
});

test("decimals and half-arrived text never end a sentence", () => {
  const seg = createSegmenter();
  assert.deepEqual(seg.feed("Usage grew 47"), []);
  assert.deepEqual(seg.feed("Usage grew 47.2% this week."), []);
  assert.deepEqual(seg.feed("Usage grew 47.2% this week. "), ["Usage grew 47.2% this week."]);
});

test("a new answer starts over", () => {
  const seg = createSegmenter();
  seg.feed("Hello there. ");
  assert.equal(seg.count(), 1);
  assert.deepEqual(seg.feed("Different. "), ["Different."]);
});

test("cleanUnit: stray markup goes, a lone citation says nothing", () => {
  assert.equal(cleanUnit("**Two decisions were confirmed,", false), "Two decisions were confirmed,");
  assert.equal(cleanUnit("[3].", true), "");
  assert.equal(cleanUnit("is the quarterly planning", false), "is the quarterly planning");
});
