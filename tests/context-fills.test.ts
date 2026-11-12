// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyLiveContextFill,
  contextFillHeadline,
  dismissContextFill,
  emptyContextFillsState,
  hydrateContextFills,
  responderUserId,
  visibleContextFills,
} from "../src/lib/realtime/contextFills.ts";
import { citationLink } from "../src/lib/realtime/suggestions.ts";

const F1 = "11111111-1111-5111-8111-111111111111";
const F2 = "22222222-2222-5222-8222-222222222222";
const BOB = "33333333-3333-4333-8333-333333333333";
const M1 = "44444444-4444-4444-8444-444444444444";
const M0 = "55555555-5555-4555-8555-555555555555";
const D1 = "66666666-6666-4666-8666-666666666666";

const live = (over: object = {}) => ({
  id: F1,
  meetingId: M1,
  content: "The team picked Acme as the vendor last Tuesday.",
  confidence: 0.82,
  rationale: "Bob's Myte had the decision from the prior sync.",
  hop: "peer",
  responder: `user:${BOB}`,
  citations: [{ kind: "decision", decision_id: D1, meeting_id: M0 }],
  createdAt: "2026-11-10T10:00:00.000Z",
  ...over,
});

const noNames = () => null;

test("a live fill becomes a card naming the responder from the room", () => {
  const s = applyLiveContextFill(emptyContextFillsState, live());
  const [f] = visibleContextFills(s);
  assert.equal(f.id, F1);
  assert.equal(f.hop, "peer");
  assert.equal(f.responderUserId, BOB);
  assert.equal(f.rationale, "Bob's Myte had the decision from the prior sync.");
  assert.equal(
    contextFillHeadline(f, (id) => (id === BOB ? "Bob Lee" : null)),
    "Context added from Bob Lee's Myte",
  );
});

test("a knowledge base fill says so and never names a person", () => {
  const s = applyLiveContextFill(emptyContextFillsState, live({ hop: "rag", responder: "rag" }));
  const [f] = visibleContextFills(s);
  assert.equal(f.responderUserId, null);
  assert.equal(contextFillHeadline(f, () => "Bob Lee"), "Context added from your knowledge base");
});

test("an unknown responder never shows a raw id", () => {
  const s = applyLiveContextFill(emptyContextFillsState, live());
  const headline = contextFillHeadline(visibleContextFills(s)[0], noNames);
  assert.equal(headline, "Context added from a teammate's Myte");
  assert.ok(!headline.includes(BOB));
});

test("live and re-hydrated copies merge once, and the server label fills in the name", () => {
  let s = applyLiveContextFill(emptyContextFillsState, live());
  s = hydrateContextFills(s, {
    items: [
      {
        id: F1,
        content: "The team picked Acme as the vendor last Tuesday.",
        confidence: 0.82,
        hop: "peer",
        responder: `user:${BOB}`,
        responder_label: "Bob Lee",
        citations: [],
        created_at: "2026-11-10T10:00:00Z",
      },
    ],
  });
  const fills = visibleContextFills(s);
  assert.equal(fills.length, 1);
  assert.equal(contextFillHeadline(fills[0], noNames), "Context added from Bob Lee's Myte");
  // the live copy's citations are kept: nothing but the label changes after arrival
  assert.equal(fills[0].citations.length, 1);
});

test("re-hydrate after a reconnect brings back a fill that was missed live", () => {
  const s = hydrateContextFills(emptyContextFillsState, {
    items: [
      { id: F2, content: "Dana owns the migration, due Friday.", hop: "related_meeting", responder_label: "Dana", citations: [] },
      { id: F1, content: "From your notes.", hop: "rag", responder: "rag", responder_label: "Knowledge base", citations: [] },
    ],
  });
  const fills = visibleContextFills(s);
  assert.deepEqual(fills.map((f) => f.id), [F2, F1]);
  assert.equal(contextFillHeadline(fills[0], noNames), "Context added from Dana's Myte");
  assert.equal(contextFillHeadline(fills[1], noNames), "Context added from your knowledge base");
});

test("a dismissed fill never comes back from either source", () => {
  let s = applyLiveContextFill(emptyContextFillsState, live());
  s = dismissContextFill(s, F1);
  assert.deepEqual(visibleContextFills(s), []);
  s = applyLiveContextFill(s, live());
  s = hydrateContextFills(s, { items: [{ id: F1, content: "again", hop: "peer", citations: [] }] });
  assert.deepEqual(visibleContextFills(s), []);
});

test("malformed fills are ignored and leave the state untouched", () => {
  for (const bad of [
    live({ id: "not-a-uuid" }),
    live({ content: "   " }),
    live({ hop: "telepathy" }),
    null,
  ]) {
    assert.equal(applyLiveContextFill(emptyContextFillsState, bad as never), emptyContextFillsState);
  }
  assert.equal(hydrateContextFills(emptyContextFillsState, { items: "x" as never }), emptyContextFillsState);
  assert.equal(hydrateContextFills(emptyContextFillsState, {}), emptyContextFillsState);
});

test("only user:{uuid} responders yield a user id", () => {
  assert.equal(responderUserId(`user:${BOB}`), BOB);
  assert.equal(responderUserId("rag"), null);
  assert.equal(responderUserId("user:alice@example.com"), null);
  assert.equal(responderUserId(undefined), null);
});

test("citations keep the four kinds and link like suggestion chips", () => {
  const s = applyLiveContextFill(
    emptyContextFillsState,
    live({
      citations: [
        { kind: "decision", decision_id: D1, meeting_id: M0, title: "Vendor: Acme" },
        { kind: "transcript", chunk_id: "c1", start_ms: 65000 },
        { kind: "document", document_id: "doc-1", title: "Vendor brief" },
        { kind: "action", action_id: "a1" },
        { kind: "web", url: "https://example.com" },
      ],
    }),
  );
  const [f] = visibleContextFills(s);
  assert.deepEqual(f.citations.map((c) => c.kind), ["decision", "transcript", "document", "action"]);
  const links = f.citations.map((c) => citationLink(c, M1));
  assert.deepEqual(links, [
    { label: "Vendor: Acme", href: `/meetings/${M0}/decisions/${D1}` },
    { label: "Transcript at 1:05", href: `/meetings/${M1}/transcript` },
    { label: "Vendor brief", href: null },
    { label: "Action", href: `/meetings/${M1}` },
  ]);
});
