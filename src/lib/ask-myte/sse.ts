/**
 * Server-sent events, both ways, for the Ask Myte stream (ADR-0047 D8).
 *
 * `createSseParser` is incremental: feed it the decoded text of each network chunk, in order, and
 * it returns the events completed so far. A chunk may end mid-line or mid-event; the rest waits
 * for the next feed. It follows the HTML spec's field rules (`event`, `data` across several
 * lines, comments starting with ":", CRLF or LF), and skips anything that is not one of the
 * known event names or whose data is not JSON, so a proxy's keep-alive comment or a future event
 * never breaks an answer.
 *
 * Pure (no imports but the types), tested in tests/ask-myte-sse.test.ts.
 */

import type { StreamEvent, StreamEventName } from "./types.ts";

const KNOWN = new Set<StreamEventName>([
  "step",
  "delta",
  "source",
  "card",
  "proposal",
  "followups",
  "title",
  "done",
  "error",
  "saved",
  "unsaved",
]);

export interface SseParser {
  /** the next decoded chunk; returns the events it completed */
  feed(chunk: string): StreamEvent[];
  /** the end of the stream: a last event without its blank line still counts */
  end(): StreamEvent[];
}

function toEvent(name: string, data: string): StreamEvent | null {
  if (!KNOWN.has(name as StreamEventName)) return null;
  try {
    const parsed: unknown = JSON.parse(data);
    if (parsed === null || typeof parsed !== "object") return null;
    return { event: name, data: parsed } as StreamEvent;
  } catch {
    return null;
  }
}

export function createSseParser(): SseParser {
  let buffer = "";
  let name = "";
  let data: string[] = [];

  const dispatch = (out: StreamEvent[]) => {
    if (data.length > 0) {
      const ev = toEvent(name || "message", data.join("\n"));
      if (ev) out.push(ev);
    }
    name = "";
    data = [];
  };

  const line = (raw: string, out: StreamEvent[]) => {
    if (raw === "") {
      dispatch(out);
      return;
    }
    if (raw.startsWith(":")) return;
    const colon = raw.indexOf(":");
    const field = colon === -1 ? raw : raw.slice(0, colon);
    let value = colon === -1 ? "" : raw.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") name = value;
    else if (field === "data") data.push(value);
  };

  return {
    feed(chunk) {
      const out: StreamEvent[] = [];
      buffer += chunk;
      for (;;) {
        const nl = buffer.search(/\r\n|\n|\r/);
        if (nl === -1) break;
        // A lone "\r" at the very end may be the first half of "\r\n": wait for more.
        if (buffer[nl] === "\r" && nl === buffer.length - 1) break;
        const width = buffer.startsWith("\r\n", nl) ? 2 : 1;
        line(buffer.slice(0, nl), out);
        buffer = buffer.slice(nl + width);
      }
      return out;
    },
    end() {
      const out: StreamEvent[] = [];
      if (buffer) {
        line(buffer.replace(/\r$/, ""), out);
        buffer = "";
      }
      dispatch(out);
      return out;
    },
  };
}

/** One event on the wire: `event: <name>` + `data: <json>` + a blank line. */
export function encodeSse(event: StreamEvent): string {
  return `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;
}
