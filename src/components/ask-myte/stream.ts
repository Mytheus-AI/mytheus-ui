"use client";

import { createSseParser } from "@/lib/ask-myte/sse";
import type { AskRequest, StreamEvent } from "@/lib/ask-myte/types";

/* One request to the Ask Myte stream route, read to its end, for the callers that are not the
   conversation itself: a peer draft (ADR-0049 F1) and a routine run (F5). Every event reaches
   `onEvent` as it arrives; the promise settles when the stream closes. A failed request becomes
   an `error` event, so callers have one path for every failure. */

export async function streamAsk(body: AskRequest, onEvent: (ev: StreamEvent) => void, signal?: AbortSignal): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/ask-myte", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    if (!signal?.aborted) onEvent({ event: "error", data: { reason: "unavailable", message: "" } });
    return;
  }
  if (!res.ok || !res.body || !(res.headers.get("content-type") ?? "").includes("text/event-stream")) {
    onEvent({ event: "error", data: { reason: res.status === 401 || res.status === 404 ? "session" : "unavailable", message: "" } });
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parser = createSseParser();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const ev of parser.feed(decoder.decode(value, { stream: true }))) onEvent(ev);
    }
    for (const ev of parser.end()) onEvent(ev);
  } catch {
    if (!signal?.aborted) onEvent({ event: "error", data: { reason: "unavailable", message: "" } });
  }
}
