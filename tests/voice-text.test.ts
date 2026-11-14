// Run: npm test
// What a Myte says, made ready for its voice (ADR-0050): markdown and citations out, sentences
// and short chunks in, the first chunk short for a quick first sound.
import assert from "node:assert/strict";
import { test } from "node:test";

import { CHUNK_CHARS, FIRST_CHUNK_CHARS, MAX_SPEECH_CHARS, sentences, speakable, speechChunks } from "../src/lib/voice/text.ts";

test("citation markers are never said", () => {
  assert.equal(speakable("Maya owns the launch [1]. Raj signed off [2, 3] and Priya agreed [4-5]."), "Maya owns the launch. Raj signed off and Priya agreed.");
  assert.equal(speakable("Due Friday[12]."), "Due Friday.");
});

test("markdown is read as plain words", () => {
  assert.equal(speakable("**Bold** and *italic* and `code` and ~~gone~~."), "Bold and italic and code and gone.");
  assert.equal(speakable("See [the decision](/decisions/d1) for more."), "See the decision for more.");
  assert.equal(speakable("![chart](/x.png)Numbers are up 47.2%."), "Numbers are up 47.2%.");
  assert.equal(speakable("Visit https://example.com today."), "Visit today.");
  // snake_case and a lone asterisk survive
  assert.equal(speakable("The field agent_name is 5 * 3 wide."), "The field agent_name is 5 * 3 wide.");
});

test("headings and list items become their own sentences; code blocks are skipped", () => {
  const md = "## What changed\n\n- Maya owns the launch\n- Raj reviews it.\n1. Ship Friday\n\n```ts\nconst x = 1;\n```\nThat is all";
  assert.equal(speakable(md), "What changed. Maya owns the launch. Raj reviews it. Ship Friday. That is all.");
});

test("soft line breaks join a paragraph; blank lines end it", () => {
  assert.equal(speakable("One thing is on you,\nthe budget review\n\nNothing else"), "One thing is on you, the budget review. Nothing else.");
});

test("tables are read row by row", () => {
  assert.equal(speakable("| Who | What |\n|---|---|\n| Maya | Launch |"), "Who, What. Maya, Launch.");
});

test("empty and whitespace texts say nothing", () => {
  assert.equal(speakable(""), "");
  assert.deepEqual(speechChunks("   \n\n [1] "), []);
});

test("sentences split only where punctuation meets a space", () => {
  assert.deepEqual(sentences("Up 47.2% this week. Why? Because e.g.it grew! Done"), ["Up 47.2% this week.", "Why?", "Because e.g.it grew!", "Done"]);
});

test("the first chunk is one sentence, the rest join up to the limit", () => {
  const text = "First thing. Second thing is here. Third thing follows. Fourth.";
  const chunks = speechChunks(text);
  assert.equal(chunks[0], "First thing.");
  assert.equal(chunks[1], "Second thing is here. Third thing follows. Fourth.");
});

test("long sentences are cut at a clause, never over the limits", () => {
  const long = `${"word ".repeat(60).trim()}, ${"more ".repeat(80).trim()}.`;
  const chunks = speechChunks(long);
  assert.ok(chunks.length > 1);
  assert.ok(chunks[0]!.length <= FIRST_CHUNK_CHARS);
  for (const c of chunks) assert.ok(c.length <= CHUNK_CHARS && c.length <= MAX_SPEECH_CHARS, `${c.length}`);
  // nothing lost
  assert.equal(chunks.join(" ").replace(/\s+/g, " "), long);
});

test("a word longer than the limit is still cut", () => {
  const chunks = speechChunks("x".repeat(700), { first: 100, max: 300 });
  assert.deepEqual(
    chunks.map((c) => c.length),
    [100, 300, 300],
  );
});
