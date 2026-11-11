/**
 * "Decisions that follow you" on Google Docs, Gmail and Jira: a quiet margin note beside what you
 * are writing when it conflicts with a decision your team confirmed in a meeting.
 *
 * Privacy first. This script reads nothing until the person turned on BOTH the master switch
 * ("Check what I write against decisions", off by default) and this site's switch in the popup.
 * Until then it only listens for those switches; no editor listener is attached, no text is read,
 * nothing is sent. Turning a switch off detaches everything and forgets what was being checked.
 * When on, only the paragraph being written (at most 1500 characters) is checked, 1.5 s after
 * typing stops, and only when it changed. The background worker re-checks the switches before
 * anything leaves the browser.
 *
 * Shadow DOM keeps the site's CSS out of the note and ours out of the site.
 */

import {
  DISMISSALS_KEY,
  DecisionChecker,
  SETTINGS_KEY,
  SITE_LABELS,
  allowedFor,
  applyKey,
  blockAround,
  dismissalKey,
  docsTextFromLabels,
  headline,
  paragraphAround,
  pillText,
  placeLink,
  readSettings,
  remember,
  siteOf,
  toConflicts,
  withoutDismissed,
  type CheckOutcome,
  type Conflict,
  type DecisionCheckSettings,
  type DecisionMessage,
  type Site,
} from "./lib/decisions.ts";

const site: Site | null = siteOf(location.href);
const HOST_ID = "mytheus-decision-note";
const BLOCK_TAGS = new Set(["P", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "TD"]);

const STYLE = `
:host { all: initial; }
.root {
  --surface: #ffffff; --surface-2: #f7f5ef; --ink: #1f1d1a; --ink-2: #3d3a35; --ink-3: #6b665d;
  --line: #e4e0d4; --line-2: #d4cfc1; --signal: #d9583b; --signal-soft: #fbe6df;
  --medium: #8a5a00; --medium-soft: #fbf0d9; --pill: #1f1d1a; --pill-on: #f7f5ef; --ok: #2f6b3f;
  --shadow: 0 10px 30px rgba(31, 29, 26, .14);
  position: fixed; z-index: 2147483646; width: 320px; max-width: calc(100vw - 32px);
  font: 400 14px/1.45 "Hanken Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--ink); letter-spacing: 0;
}
@media (prefers-color-scheme: dark) {
  .root {
    --surface: #1f1d1a; --surface-2: #272521; --ink: #f3f0e8; --ink-2: #ddd8cc; --ink-3: #aaa496;
    --line: #34312c; --line-2: #46423b; --signal: #f08a6c; --signal-soft: #3b2219;
    --medium: #f0c26a; --medium-soft: #33270f; --pill: #f3f0e8; --pill-on: #1f1d1a; --ok: #8fd19e;
    --shadow: 0 10px 30px rgba(0, 0, 0, .45);
  }
}
.pill {
  all: unset; box-sizing: border-box; display: inline-flex; align-items: center; gap: 8px; max-width: 100%;
  min-height: 36px; padding: 6px 14px 6px 10px; border-radius: 999px; cursor: pointer;
  background: var(--surface); color: var(--ink); border: 1px solid var(--line-2); box-shadow: var(--shadow);
  font-weight: 600; font-size: 13px;
}
.pill:hover { background: var(--surface-2); }
.pill .text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mark { width: 8px; height: 8px; border-radius: 50%; background: var(--signal); flex: none; }
.mark.info { background: var(--medium); }
.card {
  box-sizing: border-box; background: var(--surface); border: 1px solid var(--line); border-radius: 16px;
  box-shadow: var(--shadow); overflow: hidden;
}
@media (prefers-reduced-motion: no-preference) {
  .card, .pill { animation: enter 150ms ease-out; }
  @keyframes enter { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
}
.head {
  display: flex; align-items: center; gap: 8px; padding: 10px 10px 10px 14px;
  background: var(--surface-2); border-bottom: 1px solid var(--line);
}
.brand { font-size: 12.5px; font-weight: 700; color: var(--ink-2); }
.count { margin-left: auto; font-size: 12.5px; color: var(--ink-3); font-variant-numeric: tabular-nums; }
.body { display: flex; flex-direction: column; gap: 10px; padding: 14px; }
.lede:focus { outline: none; }
.lede { margin: 0; font-weight: 600; font-size: 14.5px; line-height: 1.35; }
.decision {
  margin: 0; padding: 10px 12px; border-radius: 12px; background: var(--signal-soft); color: var(--ink);
  font: italic 500 15px/1.35 Newsreader, Georgia, "Times New Roman", serif;
}
.why { margin: 0; color: var(--ink-2); font-size: 13.5px; }
.meta { margin: 0; color: var(--ink-3); font-size: 12.5px; }
.quote { margin: 0; color: var(--ink-3); font-size: 12.5px; }
.status { margin: 0; padding: 8px 10px; border-radius: 10px; background: var(--surface-2); font-size: 13px; color: var(--ink-2); }
.status.ok { color: var(--ok); font-weight: 600; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
button.btn {
  all: unset; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center;
  min-height: 36px; padding: 0 12px; border-radius: 10px; cursor: pointer; font: 600 13px/1 inherit;
  font-family: inherit; border: 1px solid var(--line-2); background: var(--surface); color: var(--ink);
}
button.btn:hover:not([disabled]) { background: var(--surface-2); }
button.btn.primary { background: var(--pill); color: var(--pill-on); border-color: var(--pill); }
button.btn[disabled] { opacity: .55; cursor: not-allowed; }
button.icon {
  all: unset; box-sizing: border-box; display: inline-grid; place-items: center; width: 32px; height: 32px;
  border-radius: 8px; cursor: pointer; color: var(--ink-3); font: 600 16px/1 inherit; font-family: inherit;
}
button.icon:hover { background: var(--line); color: var(--ink); }
button.pill:focus-visible, button.btn:focus-visible, button.icon:focus-visible {
  outline: 2px solid var(--signal); outline-offset: 2px;
}
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`;

// ------------------------------------------------------------------ state

let settings: DecisionCheckSettings = readSettings(null);
let attached = false;
let dismissed: string[] = [];
let conflicts: Conflict[] = [];
let index = 0;
let expanded = false;
let notice: { kind: "needs-link" | "not-available"; message: string } | null = null;
let status: { text: string; ok: boolean } | null = null;
let busy = false;
let hiddenForHash: string | null = null;
let lastText = "";
let activeEditor: Element | null = null;
let caretTop: number | null = null;
let docsBuffer = "";
let docsTimer: ReturnType<typeof setInterval> | null = null;
const docsFrames = new WeakSet<Document>();

let host: HTMLElement | null = null;
let shadow: ShadowRoot | null = null;
let live: HTMLElement | null = null;

const checker = new DecisionChecker({
  isEnabled: () => attached && allowedFor(settings, site),
  send: async (text) => {
    if (!site) return { kind: "not-available", message: "" };
    const message: DecisionMessage = { type: "decisions-check", text, site, placeLabel: placeLabel() };
    return unwrap<CheckOutcome>(await sendMessage(message)) ?? { kind: "failed", message: "" };
  },
  onOutcome: (outcome, text) => onOutcome(outcome, text),
});

function sendMessage(message: DecisionMessage): Promise<unknown> {
  return chrome.runtime.sendMessage(message).catch(() => ({ ok: false }));
}

function unwrap<T>(reply: unknown): T | null {
  if (!reply || typeof reply !== "object") return null;
  const r = reply as { ok?: boolean; value?: unknown };
  return r.ok ? ((r.value as T) ?? null) : null;
}

function placeLabel(): string {
  if (!site) return "";
  if (site === "jira") {
    const key = /\b([A-Z][A-Z0-9]+-\d+)\b/.exec(location.pathname + location.search)?.[1];
    return key ? `Jira ${key}` : "Jira";
  }
  if (site === "docs") {
    const title = document.title.replace(/\s*-\s*Google Docs\s*$/, "").trim();
    return title ? `Google Docs: ${title}`.slice(0, 120) : "Google Docs";
  }
  return SITE_LABELS[site];
}

// ------------------------------------------------------------------ reading the paragraph

function editorRoot(target: Element): Element | null {
  if (target instanceof HTMLTextAreaElement) return target;
  let el: Element | null = target.closest('[contenteditable="true"], [contenteditable=""]');
  if (!el) return null;
  // The outermost editable: a nested contenteditable belongs to the same editor.
  while (el.parentElement?.closest('[contenteditable="true"], [contenteditable=""]')) {
    el = el.parentElement.closest('[contenteditable="true"], [contenteditable=""]');
    if (!el) break;
  }
  if (!el) return null;
  if (site === "gmail") {
    // Only the compose body, never the search box or a subject line.
    const body = el.getAttribute("role") === "textbox" || el.hasAttribute("g_editable");
    return body ? el : null;
  }
  return el;
}

function caretTopOf(): number | null {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const rect = sel.getRangeAt(0).getBoundingClientRect();
  return rect.height > 0 ? rect.top : null;
}

function textOfContentEditable(editor: Element): string {
  const sel = document.getSelection();
  let node: Node | null = sel && sel.rangeCount ? sel.anchorNode : null;
  if (!node || !editor.contains(node)) return paragraphAround((editor as HTMLElement).innerText.split("\n"), Infinity);
  let el: Element | null = node instanceof Element ? node : node.parentElement;
  while (el && el.parentElement && el.parentElement !== editor && !BLOCK_TAGS.has(el.tagName)) el = el.parentElement;
  if (!el || el === editor) return paragraphAround((editor as HTMLElement).innerText.split("\n"), Infinity);
  const parent = el.parentElement ?? editor;
  const siblings = Array.from(parent.children);
  const own = siblings.indexOf(el);
  // Real paragraphs (<p>, <li>) are each their own paragraph; Gmail's line <div>s run together
  // until an empty line.
  const separate = BLOCK_TAGS.has(el.tagName);
  const lines: string[] = [];
  let at = 0;
  siblings.forEach((s, i) => {
    if (i === own) at = lines.length;
    lines.push((s as HTMLElement).innerText ?? s.textContent ?? "");
    if (separate) lines.push("");
  });
  return paragraphAround(lines, at);
}

function docsAnchor(): Element | null {
  return document.querySelector(".kix-appview-editor") ?? document.querySelector(".docs-texteventtarget-iframe");
}

function docsText(): string {
  const labels = Array.from(document.querySelectorAll(".kix-canvas-tile-content svg rect[aria-label]")).map((r) =>
    r.getAttribute("aria-label"),
  );
  const canvas = docsTextFromLabels(labels);
  if (canvas && docsBuffer.trim()) {
    // Find the line that ends what was just typed, and take its paragraph with what was already there.
    const tail = docsBuffer.replace(/\s+/g, " ").trim().slice(-24);
    const lines = canvas.split("\n");
    const at = lines.findIndex((l) => l.replace(/\s+/g, " ").includes(tail));
    if (at !== -1) return paragraphAround(lines, at);
  }
  return blockAround(docsBuffer, docsBuffer.length);
}

function onDocsKey(event: KeyboardEvent): void {
  if (!attached || event.isComposing || event.metaKey || event.ctrlKey) return;
  docsBuffer = applyKey(docsBuffer, event.key);
  activeEditor = docsAnchor();
  caretTop = null;
  check(docsText());
}

function watchDocsFrame(): void {
  const frame = document.querySelector<HTMLIFrameElement>(".docs-texteventtarget-iframe");
  const doc = frame?.contentDocument;
  if (!doc || docsFrames.has(doc)) return;
  docsFrames.add(doc);
  doc.addEventListener("keydown", (e) => onDocsKey(e as KeyboardEvent), true);
}

function onEdit(event: Event): void {
  if (!attached) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  const editor = editorRoot(target);
  if (!editor) return;
  activeEditor = editor;
  let text: string;
  if (editor instanceof HTMLTextAreaElement) {
    text = blockAround(editor.value, editor.selectionStart ?? editor.value.length);
    caretTop = null;
  } else {
    text = textOfContentEditable(editor);
    caretTop = caretTopOf();
  }
  check(text);
}

function check(text: string): void {
  lastText = text;
  checker.update(text);
}

// ------------------------------------------------------------------ attach / detach (the privacy switch)

function attach(): void {
  if (attached || !site) return;
  attached = true;
  if (site === "docs") {
    watchDocsFrame();
    docsTimer = setInterval(watchDocsFrame, 2000);
  } else {
    document.addEventListener("input", onEdit, true);
  }
  document.addEventListener("keydown", onShortcut, true);
  window.addEventListener("resize", place);
  window.addEventListener("scroll", place, true);
}

function detach(): void {
  if (!attached) return;
  attached = false;
  document.removeEventListener("input", onEdit, true);
  document.removeEventListener("keydown", onShortcut, true);
  window.removeEventListener("resize", place);
  window.removeEventListener("scroll", place, true);
  if (docsTimer) clearInterval(docsTimer);
  docsTimer = null;
  docsBuffer = "";
  checker.reset();
  conflicts = [];
  notice = null;
  status = null;
  lastText = "";
  activeEditor = null;
  removeNote();
}

function apply(next: DecisionCheckSettings): void {
  settings = next;
  if (allowedFor(settings, site)) attach();
  else detach();
}

// ------------------------------------------------------------------ outcomes

function hashOf(text: string): string {
  return `${text.length}:${text.slice(0, 40)}:${text.slice(-40)}`;
}

function onOutcome(outcome: CheckOutcome | { kind: "clear" }, text: string): void {
  if (!attached) return;
  if (outcome.kind === "clear") {
    conflicts = [];
    status = null;
    render();
    return;
  }
  if (outcome.kind === "needs-link") {
    notice = { kind: "needs-link", message: "Connect the extension to your Mytheus account to check this against decisions." };
    conflicts = [];
    render();
    return;
  }
  if (outcome.kind === "not-available") {
    // Said once per page, quietly; closing it keeps it closed.
    if (notice?.kind !== "not-available" && outcome.message) notice = { kind: "not-available", message: outcome.message };
    render();
    return;
  }
  if (outcome.kind === "rate-limited" || outcome.kind === "failed") return; // stay quiet, try later
  notice = null;
  const next = withoutDismissed(toConflicts(outcome.result), dismissed);
  const same = next.length && conflicts.length && next[0].decisionId === conflicts[0].decisionId;
  conflicts = next;
  if (!same) {
    index = 0;
    expanded = false;
    status = null;
  }
  if (hiddenForHash !== null && hiddenForHash !== hashOf(text)) hiddenForHash = null;
  if (conflicts.length) announce(`Mytheus: ${headline(conflicts[0])}`);
  render();
}

// ------------------------------------------------------------------ the note

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, string | boolean | ((e: Event) => void)> = {},
  ...children: (Node | string | null | false | undefined)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === "function") el.addEventListener(key.replace(/^on/, "").toLowerCase(), value);
    else if (value === true) el.setAttribute(key, "");
    else if (value !== false) el.setAttribute(key, value);
  }
  for (const child of children) if (child) el.append(child);
  return el;
}

function ensureHost(): ShadowRoot {
  if (shadow && host?.isConnected) return shadow;
  host = document.createElement("div");
  host.id = HOST_ID;
  shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = STYLE;
  live = h("div", { class: "sr", role: "status", "aria-live": "polite" });
  shadow.append(style, live, h("div", { class: "root", part: "root" }));
  document.documentElement.append(host);
  return shadow;
}

function removeNote(): void {
  host?.remove();
  host = null;
  shadow = null;
  live = null;
}

function announce(text: string): void {
  ensureHost();
  if (live) live.textContent = text;
}

function rootEl(): HTMLElement | null {
  return (shadow?.querySelector(".root") as HTMLElement | null) ?? null;
}

function place(): void {
  const root = rootEl();
  if (!root) return;
  const width = Math.min(320, window.innerWidth - 32);
  const rect = activeEditor?.getBoundingClientRect();
  let left = window.innerWidth - width - 16;
  let top = 88;
  if (rect && rect.width > 0) {
    left = rect.right + 16 + width <= window.innerWidth - 8 ? rect.right + 16 : Math.max(16, rect.right - width - 8);
    top = caretTop ?? rect.top;
  }
  const height = root.offsetHeight || 48;
  top = Math.min(Math.max(top, 16), window.innerHeight - height - 16);
  root.style.left = `${Math.round(left)}px`;
  root.style.top = `${Math.round(Math.max(16, top))}px`;
}

function render(): void {
  const showConflict = conflicts.length > 0 && hiddenForHash === null;
  if (!showConflict && !notice) {
    if (host) {
      const root = rootEl();
      root?.replaceChildren();
    }
    return;
  }
  ensureHost();
  const root = rootEl();
  if (!root) return;
  if (showConflict) root.replaceChildren(expanded ? card(conflicts[Math.min(index, conflicts.length - 1)]) : pill());
  else if (notice) root.replaceChildren(noticeView(notice));
  place();
}

function focusInNote(selector: string): void {
  requestAnimationFrame(() => (shadow?.querySelector(selector) as HTMLElement | null)?.focus());
}

function pill(): HTMLElement {
  const c = conflicts[0];
  return h(
    "button",
    {
      class: "pill",
      type: "button",
      "aria-expanded": "false",
      "aria-label": `${headline(c)} Show the decision`,
      title: "Mytheus: this conflicts with a confirmed decision (Alt+Shift+D)",
      onclick: () => {
        expanded = true;
        render();
        focusInNote(".lede");
      },
    },
    h("span", { class: "mark", "aria-hidden": "true" }),
    h("span", { class: "text" }, pillText(c, conflicts.length)),
  );
}

function card(c: Conflict): HTMLElement {
  const of = conflicts.length > 1 ? `${Math.min(index, conflicts.length - 1) + 1} of ${conflicts.length}` : "";
  const nav = (step: number) => () => {
    index = (index + step + conflicts.length) % conflicts.length;
    status = null;
    render();
  };
  return h(
    "section",
    {
      class: "card",
      role: "dialog",
      "aria-label": "A decision this conflicts with",
      onkeydown: (e: Event) => {
        if ((e as KeyboardEvent).key === "Escape") {
          e.stopPropagation();
          collapse();
        }
      },
    },
    h(
      "div",
      { class: "head" },
      h("span", { class: "mark", "aria-hidden": "true" }),
      h("span", { class: "brand" }, "Mytheus"),
      of ? h("span", { class: "count" }, of) : h("span", { class: "count" }),
      conflicts.length > 1
        ? h("button", { class: "icon", type: "button", "aria-label": "Previous decision", onclick: nav(-1) }, "‹")
        : null,
      conflicts.length > 1
        ? h("button", { class: "icon", type: "button", "aria-label": "Next decision", onclick: nav(1) }, "›")
        : null,
      h("button", { class: "icon", type: "button", "aria-label": "Hide for now", title: "Hide for now (Esc)", onclick: hideForNow }, "×"),
    ),
    h(
      "div",
      { class: "body" },
      h("p", { class: "lede", tabindex: "-1" }, headline(c)),
      h("blockquote", { class: "decision" }, c.decision),
      c.why ? h("p", { class: "why" }, c.why) : null,
      c.quote ? h("p", { class: "quote" }, `You wrote: “${c.quote}”`) : null,
      c.owner ? h("p", { class: "meta" }, `Owner: ${c.owner}`) : null,
      status ? h("p", { class: `status${status.ok ? " ok" : ""}`, role: "status" }, status.text) : null,
      h(
        "div",
        { class: "actions" },
        h("button", { class: "btn primary", type: "button", onclick: () => void sendMessage({ type: "decisions-open", path: c.path }) }, "Open the decision"),
        h(
          "button",
          {
            class: "btn",
            type: "button",
            disabled: busy || c.reopenRequested,
            onclick: () => void reopen(c),
          },
          c.reopenRequested ? "Reopen requested" : "Reopen it",
        ),
        h("button", { class: "btn", type: "button", disabled: busy, onclick: () => void dismiss(c) }, "Dismiss"),
      ),
    ),
  );
}

function noticeView(n: { kind: "needs-link" | "not-available"; message: string }): HTMLElement {
  return h(
    "section",
    { class: "card", role: "region", "aria-label": "Mytheus decision checks" },
    h(
      "div",
      { class: "head" },
      h("span", { class: "mark info", "aria-hidden": "true" }),
      h("span", { class: "brand" }, "Mytheus"),
      h("span", { class: "count" }),
      h(
        "button",
        {
          class: "icon",
          type: "button",
          "aria-label": "Close",
          onclick: () => {
            notice = null;
            render();
          },
        },
        "×",
      ),
    ),
    h(
      "div",
      { class: "body" },
      h("p", { class: "why" }, n.message),
      n.kind === "needs-link"
        ? h(
            "div",
            { class: "actions" },
            h("button", { class: "btn primary", type: "button", onclick: () => void sendMessage({ type: "decisions-connect" }) }, "Connect the extension"),
          )
        : null,
    ),
  );
}

function collapse(): void {
  expanded = false;
  render();
  focusInNote(".pill");
}

function hideForNow(): void {
  hiddenForHash = hashOf(lastText);
  expanded = false;
  render();
}

async function dismiss(c: Conflict): Promise<void> {
  const key = dismissalKey(c.decisionId, c.quote);
  dismissed = remember(dismissed, key);
  await chrome.storage.local.set({ [DISMISSALS_KEY]: dismissed });
  conflicts = conflicts.filter((x) => x !== c);
  index = 0;
  status = null;
  announce(conflicts.length ? "Dismissed. Mytheus will not flag this sentence for that decision again." : "Dismissed.");
  render();
  if (!conflicts.length) expanded = false;
  // Remembered on the server too, so the same sentence is not flagged anywhere else.
  void sendMessage({ type: "decisions-dismiss", decisionId: c.decisionId, quote: c.quote });
}

async function reopen(c: Conflict): Promise<void> {
  if (!site || busy) return;
  busy = true;
  status = { text: "Asking the owner…", ok: false };
  render();
  const reply = unwrap<{ ok: boolean; owner?: string | null; message?: string; needsLink?: boolean }>(
    await sendMessage({
      type: "decisions-reopen",
      decisionId: c.decisionId,
      quote: c.quote,
      site,
      placeLabel: placeLabel(),
      link: placeLink(site, location.href),
    }),
  );
  busy = false;
  if (reply?.ok) {
    c.reopenRequested = true;
    const who = reply.owner ?? c.owner;
    status = {
      text: who
        ? `Sent to ${who}. They can schedule a revisit or add a follow-up.`
        : "Reopen request sent. The decision's owner decides what happens next.",
      ok: true,
    };
  } else if (reply?.needsLink) {
    notice = { kind: "needs-link", message: "Connect the extension to your Mytheus account first." };
    status = null;
  } else {
    status = { text: reply?.message ?? "Mytheus could not send that just now. Try again.", ok: false };
  }
  render();
  focusInNote(".status");
}

function onShortcut(event: KeyboardEvent): void {
  if (!(event.altKey && event.shiftKey && (event.key === "D" || event.key === "d" || event.code === "KeyD"))) return;
  if (!conflicts.length) return;
  event.preventDefault();
  hiddenForHash = null;
  expanded = true;
  render();
  focusInNote(".lede");
}

// ------------------------------------------------------------------ start

if (site) {
  void chrome.storage.local.get([SETTINGS_KEY, DISMISSALS_KEY]).then((got) => {
    dismissed = Array.isArray(got[DISMISSALS_KEY]) ? (got[DISMISSALS_KEY] as string[]) : [];
    apply(readSettings(got[SETTINGS_KEY]));
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes[SETTINGS_KEY]) apply(readSettings(changes[SETTINGS_KEY].newValue));
    if (changes[DISMISSALS_KEY]) dismissed = (changes[DISMISSALS_KEY].newValue as string[] | undefined) ?? [];
  });
}
