// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  addStatement,
  checkStatements,
  cleanStatement,
  firstName,
  logSummary,
  normalizeStatements,
  sameStatements,
  uncoveredAnswer,
} from "../src/lib/delegated-answers.ts";
import type { DelegatedAnswerEntry } from "../src/lib/api/only-mytheus-types.ts";

test("adding a statement cleans it and keeps the order", () => {
  const r = addStatement(["We ship on Dec 2"], "  Budget   is approved ");
  assert.deepEqual(r, { ok: true, list: ["We ship on Dec 2", "Budget is approved"] });
});

test("blank, too long, duplicate and over the limit are refused with a reason", () => {
  assert.equal(addStatement([], "   ").ok, false);
  assert.equal(addStatement([], "x".repeat(301)).ok, false);
  assert.equal(addStatement([], "x".repeat(300)).ok, true);
  assert.equal(addStatement(["We ship on Dec 2"], "we ship on  dec 2").ok, false);
  const ten = Array.from({ length: 10 }, (_, i) => `Statement ${i}`);
  const full = addStatement(ten, "One more");
  assert.equal(full.ok, false);
  assert.match(!full.ok ? full.message : "", /at most 10/);
  assert.equal(addStatement(["a"], "b", { statementsMax: 1, charsMax: 300 }).ok, false);
});

test("a save sends clean, unique statements", () => {
  assert.deepEqual(normalizeStatements([" A  b ", "", "a B", "C"]), ["A b", "C"]);
  assert.equal(cleanStatement("\n x \t y "), "x y");
  assert.equal(sameStatements(["A", "B"], [" A ", "B", "b"]), true);
  assert.equal(sameStatements(["A", "B"], ["B", "A"]), false);
  assert.deepEqual(checkStatements(["One", "one", "Two"]), { ok: true, statements: ["One", "Two"] });
  assert.equal(checkStatements("nope").ok, false);
  assert.equal(checkStatements(Array.from({ length: 11 }, (_, i) => `S${i}`)).ok, false);
  assert.equal(checkStatements(["x".repeat(301)]).ok, false);
});

test("the uncovered answer uses the first name, exactly", () => {
  assert.equal(firstName("Sarah Okafor"), "Sarah");
  assert.equal(firstName("  "), "Your teammate");
  assert.equal(uncoveredAnswer("Sarah Okafor"), "Sarah didn't pre-approve an answer to that.");
});

test("the log summary counts what the statements covered", () => {
  const e = (covered: boolean) => ({ covered }) as DelegatedAnswerEntry;
  assert.equal(logSummary([]), "Nobody asked your agent anything.");
  assert.equal(logSummary([e(true)]), "1 question, all answered from your statements.");
  assert.equal(logSummary([e(false), e(false)]), "2 questions, none covered by your statements.");
  assert.equal(logSummary([e(true), e(false), e(true)]), "3 questions, 2 answered from your statements.");
});
