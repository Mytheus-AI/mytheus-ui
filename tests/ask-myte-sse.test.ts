// Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";

import { createSseParser, encodeSse } from "../src/lib/ask-myte/sse.ts";
import type { StreamEvent } from "../src/lib/ask-myte/types.ts";

test("parses events split across chunks at any point", () => {
  const wire =
    encodeSse({ event: "step", data: { id: "step-1", label: "Looking through your meetings", state: "running" } }) +
    encodeSse({ event: "delta", data: { text: "Two decisions [1]." } }) +
    encodeSse({ event: "done", data: { abstained: false, degraded: false, cited: [1] } });
  for (let size = 1; size <= 17; size++) {
    const p = createSseParser();
    const out: StreamEvent[] = [];
    for (let i = 0; i < wire.length; i += size) out.push(...p.feed(wire.slice(i, i + size)));
    out.push(...p.end());
    assert.deepEqual(
      out.map((e) => e.event),
      ["step", "delta", "done"],
      `chunk size ${size}`,
    );
    assert.equal((out[1].data as { text: string }).text, "Two decisions [1].");
  }
});

test("CRLF, multi-line data, comments and unknown events", () => {
  const p = createSseParser();
  const out = p.feed(': keep-alive\r\nevent: delta\r\ndata: {"text":\r\ndata: "hi"}\r\n\r\nevent: mystery\ndata: {}\n\nevent: delta\ndata: not json\n\n');
  assert.equal(out.length, 1);
  assert.deepEqual(out[0], { event: "delta", data: { text: "hi" } });
});

test("a lone CR at a chunk edge waits for its LF", () => {
  const p = createSseParser();
  assert.deepEqual(p.feed('event: title\r\ndata: {"text":"Prep"}\r'), []);
  const out = p.feed("\n\r\n");
  assert.deepEqual(out, [{ event: "title", data: { text: "Prep" } }]);
});

test("the last event without a blank line still counts at the end", () => {
  const p = createSseParser();
  assert.deepEqual(p.feed('event: error\ndata: {"reason":"budget","message":"Back on Dec 1"}'), []);
  assert.deepEqual(p.end(), [{ event: "error", data: { reason: "budget", message: "Back on Dec 1" } }]);
});

test("non-object data is ignored", () => {
  const p = createSseParser();
  assert.deepEqual(p.feed("event: delta\ndata: 42\n\nevent: delta\ndata: null\n\n"), []);
});
