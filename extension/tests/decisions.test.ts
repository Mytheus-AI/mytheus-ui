import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  DEFAULT_SETTINGS,
  DecisionChecker,
  MAX_CHARS,
  allowedFor,
  applyKey,
  blockAround,
  checkable,
  clipAround,
  dismissalKey,
  docsTextFromLabels,
  headline,
  isDecisionMessage,
  paragraphAround,
  pillText,
  placeLink,
  readSettings,
  remember,
  shortDate,
  siteOf,
  textHash,
  toConflicts,
  withoutDismissed,
  type CheckOutcome,
} from "../src/lib/decisions.ts";

const D1 = "11111111-1111-4111-8111-111111111111";
const D2 = "22222222-2222-4222-8222-222222222222";
const M1 = "33333333-3333-4333-8333-333333333333";
const LONG = "We should keep the free tier for small teams and charge only above twenty seats from January.";

// ---------------------------------------------------------------- settings and gating

test("checks are off by default, and garbage settings read as off", () => {
  assert.equal(DEFAULT_SETTINGS.enabled, false);
  for (const raw of [null, undefined, "on", 1, { enabled: "true" }, { enabled: 1 }]) {
    assert.equal(readSettings(raw).enabled, false, JSON.stringify(raw));
  }
  assert.deepEqual(readSettings({ enabled: true, sites: { gmail: false, jira: "no" } }), {
    enabled: true,
    sites: { docs: true, gmail: false, jira: true },
  });
});

test("a site is read only when the master switch and its own switch are both on", () => {
  const on = readSettings({ enabled: true, sites: { docs: true, gmail: false, jira: true } });
  assert.equal(allowedFor(on, "docs"), true);
  assert.equal(allowedFor(on, "gmail"), false);
  assert.equal(allowedFor(readSettings({ enabled: false }), "docs"), false);
  assert.equal(allowedFor(on, null), false);
});

test("only the three writing surfaces are recognised, over https", () => {
  assert.equal(siteOf("https://docs.google.com/document/d/abc/edit"), "docs");
  assert.equal(siteOf("https://docs.google.com/spreadsheets/d/abc/edit"), null);
  assert.equal(siteOf("https://mail.google.com/mail/u/0/#inbox?compose=new"), "gmail");
  assert.equal(siteOf("https://acme.atlassian.net/browse/PRJ-12"), "jira");
  assert.equal(siteOf("http://acme.atlassian.net/browse/PRJ-12"), null);
  assert.equal(siteOf("https://atlassian.net.evil.com/"), null);
  assert.equal(siteOf("not a url"), null);
  assert.equal(siteOf(undefined), null);
});

test("a Gmail draft sends no link; Docs and Jira send the page without its fragment", () => {
  assert.equal(placeLink("gmail", "https://mail.google.com/mail/u/0/#drafts"), null);
  assert.equal(placeLink("docs", "https://docs.google.com/document/d/x/edit#heading=h.1"), "https://docs.google.com/document/d/x/edit");
  assert.equal(placeLink("jira", "https://acme.atlassian.net/browse/PRJ-1?x=1"), "https://acme.atlassian.net/browse/PRJ-1?x=1");
});

// ---------------------------------------------------------------- text selection

test("the paragraph around the caret, never the whole document", () => {
  const text = `First paragraph about hiring plans for the platform team next quarter.\n\n${LONG}\n\nThird paragraph about the offsite in Lisbon and who books the venue.`;
  const caret = text.indexOf("twenty");
  assert.equal(blockAround(text, caret), LONG);
  assert.ok(!blockAround(text, caret).includes("Lisbon"));
});

test("a short new line borrows the paragraph above it for context", () => {
  const lines = ["Pricing for next year, as I see it:", "", "Keep it free."];
  assert.equal(paragraphAround(lines, 2), "Pricing for next year, as I see it: Keep it free.");
  assert.equal(paragraphAround(["a b c d e f g", "", ""], 2), "a b c d e f g", "caret on an empty line: the paragraph above");
  assert.equal(paragraphAround(["line one of", "line two of the same", "", "other"], 0), "line one of line two of the same");
});

test("long paragraphs are clipped to 1500 characters around the caret, on word boundaries", () => {
  const words = Array.from({ length: 600 }, (_, i) => `w${i}`).join(" ");
  const clipped = clipAround(words, words.length);
  assert.ok(clipped.length <= MAX_CHARS);
  assert.ok(clipped.endsWith("w599"));
  assert.ok(/^w\d+/.test(clipped), "starts on a whole word");
  assert.equal(clipAround("short", 2), "short");
});

test("Google Docs: annotated canvas labels become lines; the typing buffer follows keys", () => {
  assert.equal(docsTextFromLabels(["Hello world​", null, "  ", "Second"]), "Hello world\nSecond");
  let b = "";
  for (const k of ["H", "i", "Shift", "Backspace", "!", "Enter", "a", "ArrowLeft"]) b = applyKey(b, k);
  assert.equal(b, "H!\na");
  assert.equal(applyKey("x".repeat(4000), "y").length, 4000);
});

test("too little text is never checked", () => {
  assert.equal(checkable("Sounds good"), false);
  assert.equal(checkable(LONG), true);
  assert.equal(textHash(" A  b "), textHash("a b"));
});

// ---------------------------------------------------------------- the wire and the copy

const WIRE = {
  status: "ok",
  reason: null,
  conflicts: [
    {
      decision_id: D2,
      decision_content: "Free tier stays for teams under 10 seats",
      meeting_id: M1,
      meeting_title: "Pricing review",
      decided_at: "2026-10-03",
      owner: { id: D1, name: "Dana Reyes" },
      quote: "charge only above twenty seats",
      relation: "contradicts",
      confidence: 0.82,
      why: "The decision set the line at 10 seats, not 20.",
      link: `/meetings/${M1}/decisions/${D2}`,
      challenge_id: null,
      reopen_request_id: null,
    },
    {
      decision_id: D1,
      decision_content: "Annual billing only",
      meeting_id: M1,
      meeting_title: null,
      decided_at: null,
      owner: null,
      quote: "from January",
      relation: "reopens",
      confidence: 0.91,
      why: "",
      link: "https://evil.example/x",
      challenge_id: null,
      reopen_request_id: "44444444-4444-4444-8444-444444444444",
    },
    { decision_id: "not-a-uuid", decision_content: "x" },
    null,
  ],
};

test("the check answer maps to notes, best first, malformed rows dropped, links kept same-site", () => {
  const out = toConflicts(WIRE);
  assert.equal(out.length, 2);
  assert.equal(out[0].decisionId, D1);
  assert.equal(out[0].path, `/meetings/${M1}/decisions/${D1}`, "an off-site link is never followed");
  assert.equal(out[0].reopenRequested, true);
  assert.equal(out[1].owner, "Dana Reyes");
  assert.equal(out[1].decidedAt, "2026-10-03");
  assert.deepEqual(toConflicts(null), []);
  assert.deepEqual(toConflicts({ conflicts: "x" }), []);
});

test("the note says when and where it was decided", () => {
  const now = new Date("2026-11-11T00:00:00Z");
  const [reopens, contradicts] = toConflicts(WIRE);
  assert.equal(headline(contradicts, now), "This was decided otherwise on 3 Oct (Pricing review).");
  assert.equal(headline(reopens, now), "This was already decided in an earlier meeting.");
  assert.equal(shortDate("2025-01-09", now), "9 Jan 2025");
  assert.equal(shortDate("garbage", now), null);
  assert.equal(pillText(contradicts, 2, now), "Decided otherwise on 3 Oct · 2 decisions");
});

test("a dismissed sentence stays dismissed for that decision only", () => {
  const out = toConflicts(WIRE);
  const key = dismissalKey(D2, "Charge only  above twenty seats");
  const left = withoutDismissed(out, [key]);
  assert.deepEqual(left.map((c) => c.decisionId), [D1]);
  assert.deepEqual(remember(["a", "b"], "a"), ["b", "a"]);
  assert.equal(remember(Array.from({ length: 500 }, (_, i) => `k${i}`), "new").length, 500);
});

test("decision messages are recognised; capture messages are not", () => {
  assert.equal(isDecisionMessage({ type: "decisions-check" }), true);
  assert.equal(isDecisionMessage({ type: "start" }), false);
  assert.equal(isDecisionMessage(null), false);
});

// ---------------------------------------------------------------- the checker

function harness(opts: { enabled?: () => boolean; reply?: (text: string) => Promise<CheckOutcome> } = {}) {
  let clock = 0;
  const timers: { at: number; fn: () => void; id: number }[] = [];
  let nextId = 1;
  const sent: string[] = [];
  const outcomes: string[] = [];
  const checker = new DecisionChecker({
    isEnabled: opts.enabled ?? (() => true),
    send: async (text) => {
      sent.push(text);
      return opts.reply ? opts.reply(text) : { kind: "result", result: { status: "ok", reason: null, conflicts: [] } };
    },
    onOutcome: (o) => outcomes.push(o.kind),
    now: () => clock,
    setTimer: (fn, ms) => {
      const id = nextId++;
      timers.push({ at: clock + ms, fn, id });
      return id;
    },
    clearTimer: (id) => {
      const i = timers.findIndex((t) => t.id === id);
      if (i !== -1) timers.splice(i, 1);
    },
  });
  const advance = async (ms: number) => {
    clock += ms;
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      const due = timers[0];
      if (!due || due.at > clock) break;
      timers.shift();
      due.fn();
      await new Promise((r) => setImmediate(r));
    }
    await new Promise((r) => setImmediate(r));
  };
  return { checker, sent, outcomes, advance };
}

test("nothing is sent until typing pauses for 1.5 s, and then only the latest text", async () => {
  const { checker, sent, advance } = harness();
  checker.update(`${LONG} a`);
  await advance(1000);
  checker.update(`${LONG} ab`);
  await advance(1000);
  assert.equal(sent.length, 0);
  await advance(600);
  assert.deepEqual(sent, [`${LONG} ab`]);
});

test("the same text is not checked twice; short text clears the note without a call", async () => {
  const { checker, sent, outcomes, advance } = harness();
  checker.update(LONG);
  await advance(1600);
  checker.update(`  ${LONG}  `);
  await advance(1600);
  assert.equal(sent.length, 1);
  checker.update("ok");
  await advance(1600);
  assert.equal(sent.length, 1);
  assert.equal(outcomes.at(-1), "clear");
});

test("switched off: nothing is ever sent", async () => {
  let on = false;
  const { checker, sent, advance } = harness({ enabled: () => on });
  checker.update(LONG);
  await advance(5000);
  assert.equal(sent.length, 0);
  on = true;
  checker.update(`${LONG} now`);
  await advance(1600);
  assert.equal(sent.length, 1);
  on = false;
  checker.update(`${LONG} later`);
  await advance(5000);
  assert.equal(sent.length, 1);
});

test("a 429 backs off for retry_after, then checks again", async () => {
  let first = true;
  const { checker, sent, advance } = harness({
    reply: async () => {
      if (first) {
        first = false;
        return { kind: "rate-limited", retryAfterS: 10 };
      }
      return { kind: "result", result: { status: "ok", reason: null, conflicts: [] } };
    },
  });
  checker.update(LONG);
  await advance(1600);
  assert.equal(sent.length, 1);
  checker.update(`${LONG} more`);
  await advance(1600);
  assert.equal(sent.length, 1, "still backing off");
  await advance(9000);
  assert.equal(sent.length, 2);
});

test("one request at a time: an answer for older text is dropped and the newer text is checked", async () => {
  let release: (() => void) | null = null;
  const { checker, sent, outcomes, advance } = harness({
    reply: (text) =>
      new Promise((resolve) => {
        const done = () => resolve({ kind: "result", result: { status: "ok", reason: null, conflicts: [] } });
        if (text === LONG) release = done;
        else done();
      }),
  });
  checker.update(LONG);
  await advance(1600);
  checker.update(`${LONG} edited`);
  await advance(1600);
  assert.equal(sent.length, 1, "the first is still in flight");
  (release as unknown as () => void)();
  await advance(1);
  await advance(1);
  assert.deepEqual(sent, [LONG, `${LONG} edited`]);
  assert.equal(outcomes.length, 1, "only the answer for the current text is shown");
});

test("reset forgets the text and drops an answer in flight", async () => {
  const { checker, sent, outcomes, advance } = harness();
  checker.update(LONG);
  checker.reset();
  await advance(5000);
  assert.equal(sent.length, 0);
  assert.equal(outcomes.length, 0);
});

// ---------------------------------------------------------------- the content script's privacy gate

test("the content script attaches no editor listener before the switches allow it", () => {
  const src = readFileSync(new URL("../src/decisions-content.ts", import.meta.url), "utf8");
  const at = src.indexOf("if (site) {\n  void chrome.storage.local.get");
  assert.ok(at > 0, "the start block is where the test expects it");
  const start = src.slice(at);
  assert.ok(!/addEventListener\("(input|keydown|keyup)"/.test(start), "start wires only the settings");
  const attach = src.slice(src.indexOf("function attach()"), src.indexOf("function detach()"));
  assert.ok(attach.includes('addEventListener("input"'), "editor listeners live in attach()");
  assert.ok(src.includes("if (allowedFor(settings, site)) attach();"));
  const bg = readFileSync(new URL("../src/lib/decisions-background.ts", import.meta.url), "utf8");
  assert.ok(bg.indexOf("await allowed(sender)") < bg.indexOf("checkDecisions(token"), "the worker re-checks before sending");
});
