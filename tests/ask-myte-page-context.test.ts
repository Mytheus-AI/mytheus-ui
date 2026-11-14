// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { cleanPage, cleanScope, pageChipLabel, pageChipNoun, parsePageContext, scopeForPage, scopeLabel, scopePlaceholder, scopeShortLabel } from "../src/lib/ask-myte/page-context.ts";
import {
  applyMention,
  expandShortcut,
  failureCopy,
  groupThreads,
  matchShortcuts,
  mentionAt,
  rankMentions,
} from "../src/lib/ask-myte/compose.ts";

const M = "11111111-1111-4111-8111-111111111111";
const D = "22222222-2222-4222-8222-222222222222";

test("page context from the path and the breadcrumb", () => {
  assert.deepEqual(parsePageContext(`/meetings/${M}`, { parent: "Weekly sync" }), { kind: "meeting", id: M, title: "Weekly sync" });
  assert.deepEqual(parsePageContext(`/meetings/${M}/transcript`, { parent: "Weekly sync" }), { kind: "meeting", id: M, title: "Weekly sync" });
  assert.deepEqual(parsePageContext(`/meetings/${M}/decisions/${D}`, { label: "Drop Drive", parent: "Weekly" }), { kind: "decision", id: D, title: "Drop Drive" });
  assert.deepEqual(parsePageContext(`/people/${M}?tab=x`, { label: "Maya Chen" }), { kind: "person", id: M, title: "Maya Chen" });
  assert.equal(parsePageContext("/meetings"), null);
  assert.equal(parsePageContext("/meetings/not-a-uuid"), null);
  assert.equal(parsePageContext(`/meetings/${M}/room`), null);
  assert.equal(parsePageContext("/dashboard"), null);
  assert.equal(parsePageContext(null), null);
  assert.deepEqual(parsePageContext(`/meetings/${M}`), { kind: "meeting", id: M, title: null });
});

test("scopes and chips", () => {
  assert.deepEqual(scopeForPage({ kind: "meeting", id: M, title: "Weekly" }), { kind: "meeting", meeting_id: M, person_id: null, as_of: null, label: "Weekly" });
  assert.equal(scopeForPage({ kind: "decision", id: D, title: null }), null);
  assert.equal(pageChipLabel({ kind: "meeting", id: M, title: "Weekly" }), "This meeting: Weekly");
  assert.equal(scopeLabel({ kind: "as_of", meeting_id: null, person_id: null, as_of: "2026-10-01" }), "As of Oct 1, 2026");
  assert.equal(scopeLabel({ kind: "all", meeting_id: null, person_id: null, as_of: null }), "All of Mytheus");
  assert.deepEqual(cleanScope({ kind: "meeting", meeting_id: "bad", person_id: null, as_of: null }), { kind: "all", meeting_id: null, person_id: null, as_of: null });
  assert.deepEqual(cleanScope({ kind: "as_of", meeting_id: null, person_id: null, as_of: "2026-10-01", label: "x" }), { kind: "as_of", meeting_id: null, person_id: null, as_of: "2026-10-01" });
  assert.equal(cleanPage({ kind: "meeting", id: "x", title: null }), null);
});

test("history groups", () => {
  const now = new Date("2026-11-14T18:00:00Z");
  const t = (id: string, at: string, pinned = false) => ({ id, title: id, pinned, created_at: at, last_message_at: at });
  const g = groupThreads([t("old", "2026-10-01T00:00:00Z"), t("today", "2026-11-14T10:00:00Z"), t("pin", "2026-11-14T11:00:00Z", true), t("week", "2026-11-10T10:00:00Z")], now, "UTC");
  assert.deepEqual(g.map((x) => [x.label, x.items.map((i) => i.id)]), [
    ["Pinned", ["pin"]],
    ["Today", ["today"]],
    ["This week", ["week"]],
    ["Earlier", ["old"]],
  ]);
});

test("slash shortcuts", () => {
  assert.deepEqual(matchShortcuts("/re")?.map((s) => s.name), ["recap"]);
  assert.equal(matchShortcuts("/"!)?.length, 6);
  assert.deepEqual(expandShortcut("/routine what changed in pricing"), { question: "what changed in pricing", picker: "routine" });
  assert.equal(matchShortcuts("hello /re"), null);
  assert.deepEqual(expandShortcut("/prep"), { question: "Prep me for my next meeting", picker: null });
  assert.deepEqual(expandShortcut("/prep Test tomorrow"), { question: "Prep me for Test tomorrow", picker: null });
  assert.deepEqual(expandShortcut("/owe"), { question: "What do I owe this week?", picker: null });
  assert.deepEqual(expandShortcut("/asof what was the price"), { question: "what was the price", picker: "as_of" });
  assert.equal(expandShortcut("/prepare"), null);
  assert.equal(expandShortcut("what /prep"), null);
});

test("@ mentions", () => {
  const at = mentionAt("Ask about @Tes", 14);
  assert.deepEqual(at, { start: 10, query: "Tes" });
  assert.equal(mentionAt("email a@b", 9), null);
  assert.deepEqual(applyMention("Ask about @Tes now", at!, "Test tomorrow"), { text: "Ask about @Test tomorrow now", caret: 25 });
  const items = [
    { kind: "decision" as const, id: "1", label: "Test the beta" },
    { kind: "meeting" as const, id: "2", label: "Test" },
    { kind: "person" as const, id: "3", label: "Maya Test" },
    { kind: "meeting" as const, id: "4", label: "Weekly" },
  ];
  assert.deepEqual(rankMentions("tes", items).map((i) => i.id), ["2", "1", "3"]);
});

test("failure copy speaks in the first person", () => {
  assert.equal(failureCopy("not_connected", { name: "Pip" }).title, "I'm not connected on this workspace yet.");
  assert.equal(failureCopy("not_connected", { name: "Pip", isAdmin: true }).action?.href, "/workspace");
  assert.equal(failureCopy("budget", { name: "Pip", message: "Back on Dec 1." }).detail, "Back on Dec 1.");
  assert.equal(failureCopy("stopped", { name: "Pip" }).retry, true);
  assert.equal(failureCopy("session", { name: "Pip" }).retry, false);
});

test("the composer's scope button and placeholder follow the scope", () => {
  const now = new Date("2026-11-14T10:00:00Z");
  const all = { kind: "all" as const, meeting_id: null, person_id: null, as_of: null };
  const person = { kind: "person" as const, meeting_id: null, person_id: "p", as_of: null, label: "Samar Rihan" };
  const meeting = { kind: "meeting" as const, meeting_id: "m", person_id: null, as_of: null, label: "Feature Update" };
  const asOf = { kind: "as_of" as const, meeting_id: null, person_id: null, as_of: "2026-11-03" };
  assert.equal(scopeShortLabel(all, "en-US", now), "All of Mytheus");
  assert.equal(scopeShortLabel(person, "en-US", now), "Samar Rihan");
  assert.equal(scopeShortLabel(meeting, "en-US", now), "Feature Update");
  assert.equal(scopeShortLabel(asOf, "en-US", now), "As of Nov 3");
  assert.equal(scopeShortLabel({ ...asOf, as_of: "2025-02-01" }, "en-US", now), "As of Feb 1, 2025");
  assert.equal(scopeShortLabel({ ...person, label: null }, "en-US", now), "A person");
  assert.equal(scopePlaceholder(all, "Ask Probe anything…", "en-US", now), "Ask Probe anything…");
  assert.equal(scopePlaceholder(person, "x", "en-US", now), "Ask about Samar Rihan…");
  assert.equal(scopePlaceholder(meeting, "x", "en-US", now), "Ask about Feature Update…");
  assert.equal(scopePlaceholder(asOf, "x", "en-US", now), "Ask as of Nov 3…");
  assert.equal(pageChipNoun({ kind: "meeting" }), "This meeting");
});
