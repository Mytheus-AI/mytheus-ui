// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { acceptsFile, addAttachment, checkAttachments, pastedName, sizeLabel, totalChars, type PendingAttachment } from "../src/lib/ask-myte/attachments.ts";

test("only text files", () => {
  assert.ok(acceptsFile("notes.md"));
  assert.ok(acceptsFile("DATA.CSV"));
  assert.ok(acceptsFile("x", "text/plain"));
  assert.equal(acceptsFile("deck.pdf", "application/pdf"), false);
});

test("at most 3 files and 40,000 characters in total", () => {
  let list: PendingAttachment[] = [];
  for (let i = 0; i < 3; i++) {
    const r = addAttachment(list, { name: `${i}.txt`, text: "a".repeat(10_000) }, `k${i}`);
    assert.ok(r.ok);
    if (r.ok) list = r.list;
  }
  assert.equal(totalChars(list), 30_000);
  const fourth = addAttachment(list, { name: "x.txt", text: "b" }, "k4");
  assert.deepEqual(fourth, { ok: false, message: "You can attach up to 3 files to one question." });
  const big = addAttachment(list.slice(0, 2), { name: "big.csv", text: "c".repeat(20_001) }, "k5");
  assert.equal(big.ok, false);
  if (!big.ok) assert.match(big.message, /big\.csv is too long: 20,001 characters, and 20,000 are left/);
  assert.equal(addAttachment([], { name: "a.pdf", text: "x" }, "k").ok, false);
  assert.equal(addAttachment([], { name: "a.txt", text: "  " }, "k").ok, false);
});

test("line endings are normalised and sizes read well", () => {
  const r = addAttachment([], { name: "a.txt", text: "a\r\nb" }, "k");
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.list[0].text, "a\nb");
  assert.equal(sizeLabel(812), "812 B");
  assert.equal(sizeLabel(2458), "2.4 KB");
  assert.equal(sizeLabel(1_200_000), "1.1 MB");
});

test("pasted text gets a fresh name", () => {
  assert.equal(pastedName([]), "Pasted text.txt");
  assert.equal(pastedName([{ name: "Pasted text.txt" }]), "Pasted text 2.txt");
});

test("the route's check", () => {
  assert.deepEqual(checkAttachments(undefined), { ok: true, value: [] });
  assert.equal(checkAttachments([{ name: "", text: "x" }]).ok, false);
  assert.deepEqual(checkAttachments([{ name: " a.md ", text: "x" }]), { ok: true, value: [{ name: "a.md", text: "x" }] });
});
