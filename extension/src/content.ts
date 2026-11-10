/**
 * The always-visible recording indicator, drawn on the meeting page itself while Mytheus is
 * transcribing that tab: a small pill that says so, with the elapsed time, a reminder to tell
 * the other participants, and a Stop button. It cannot be dismissed while the capture runs.
 *
 * Shadow DOM keeps the meeting site's CSS out of it (and ours out of the site). It shows nothing
 * and does nothing unless the background worker says this exact tab is being captured.
 */

import { CONSENT_NOTICE, type CaptureState } from "./lib/protocol.ts";

const HOST_ID = "mytheus-capture-indicator";

const STYLE = `
:host { all: initial; }
.pill {
  position: fixed; top: 12px; left: 50%; transform: translateX(-50%); z-index: 2147483647;
  display: flex; align-items: center; gap: 10px; max-width: calc(100vw - 24px);
  padding: 8px 8px 8px 14px; border-radius: 999px;
  background: #1f1d1a; color: #f7f5ef; box-shadow: 0 6px 24px rgba(0,0,0,.28);
  font: 600 13px/1.2 system-ui, -apple-system, "Segoe UI", sans-serif; letter-spacing: 0;
}
.dot { width: 9px; height: 9px; border-radius: 50%; background: #f04438; flex: none; }
@media (prefers-reduced-motion: no-preference) {
  .dot { animation: pulse 2s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: .35; } }
}
.text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.time { font-variant-numeric: tabular-nums; color: #cfc9bb; font-weight: 500; }
button {
  all: unset; cursor: pointer; border-radius: 999px; padding: 6px 12px; font: inherit;
  background: #3a3631; color: #f7f5ef; white-space: nowrap;
}
button:hover { background: #4a453f; }
button:focus-visible { outline: 2px solid #f6a28c; outline-offset: 2px; }
button.stop { background: #f7f5ef; color: #1f1d1a; }
button.stop:hover { background: #ffffff; }
.remind { font-weight: 500; color: #cfc9bb; }
@media (max-width: 640px) { .remind, .time { display: none; } }
`;

let host: HTMLElement | null = null;
let timeEl: HTMLElement | null = null;
let ticker: ReturnType<typeof setInterval> | null = null;
let startedAt: number | null = null;

function format(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function remove(): void {
  host?.remove();
  host = null;
  timeEl = null;
  if (ticker) clearInterval(ticker);
  ticker = null;
}

function draw(state: CaptureState): void {
  if (!host) {
    host = document.createElement("div");
    host.id = HOST_ID;
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = STYLE;
    const pill = document.createElement("div");
    pill.className = "pill";
    pill.setAttribute("role", "status");
    pill.setAttribute("aria-label", "Mytheus is transcribing this call");

    const dot = document.createElement("span");
    dot.className = "dot";
    dot.setAttribute("aria-hidden", "true");
    const text = document.createElement("span");
    text.className = "text";
    text.textContent = "Mytheus is transcribing";
    timeEl = document.createElement("span");
    timeEl.className = "time";
    const remind = document.createElement("span");
    remind.className = "remind";
    remind.textContent = "Tell everyone";

    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "Copy note";
    copy.title = "Copy a note you can paste in the meeting chat";
    copy.addEventListener("click", () => {
      void navigator.clipboard.writeText(CONSENT_NOTICE).then(
        () => {
          copy.textContent = "Copied";
          setTimeout(() => (copy.textContent = "Copy note"), 1800);
        },
        () => (copy.textContent = "Copy failed"),
      );
    });

    const stop = document.createElement("button");
    stop.type = "button";
    stop.className = "stop";
    stop.textContent = "Stop";
    stop.addEventListener("click", () => {
      stop.textContent = "Stopping";
      void chrome.runtime.sendMessage({ type: "stop" });
    });

    pill.append(dot, text, timeEl, remind, copy, stop);
    shadow.append(style, pill);
    document.documentElement.append(host);
    ticker = setInterval(() => {
      if (timeEl && startedAt) timeEl.textContent = format(Date.now() - startedAt);
    }, 1000);
  }
  startedAt = state.startedAt;
  if (timeEl) timeEl.textContent = startedAt ? format(Date.now() - startedAt) : "";
}

function apply(state: CaptureState | null): void {
  const on = !!state && (state.phase === "starting" || state.phase === "recording" || state.phase === "stopping");
  if (on && state) draw(state);
  else remove();
}

chrome.runtime.onMessage.addListener((raw: unknown) => {
  const msg = raw as { type?: string; state?: CaptureState };
  if (msg?.type === "indicator") apply(msg.state ?? null);
  return false;
});

// On load (and after a single-page navigation reloads this script), ask whether this tab is
// being captured: the worker answers only for the captured tab.
chrome.runtime
  .sendMessage({ type: "indicator-query" })
  .then((reply: { ok?: boolean; value?: CaptureState | null } | undefined) => apply(reply?.ok ? (reply.value ?? null) : null))
  .catch(() => undefined);
