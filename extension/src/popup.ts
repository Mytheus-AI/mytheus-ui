/**
 * The toolbar popup: connect the account, name the call, confirm consent, start and stop.
 * A view only: it renders `chrome.storage` state and sends commands to the background worker.
 */

import { connectUrl } from "./lib/api.ts";
import {
  SETTINGS_KEY,
  SITES,
  SITE_LABELS,
  readSettings,
  type DecisionCheckSettings,
  type Site,
} from "./lib/decisions.ts";
import { detectMeeting, titleFromTab, type DetectedMeeting } from "./lib/meeting-url.ts";
import {
  CONSENT_NOTICE,
  IDLE_STATE,
  LINK_KEY,
  STATE_KEY,
  type BackgroundMessage,
  type CaptureState,
  type ChannelStatus,
  type LinkRecord,
} from "./lib/protocol.ts";

type Child = Node | string | null | false | undefined;

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, string | boolean | ((e: Event) => void)> = {},
  ...children: Child[]
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

const root = document.getElementById("app") as HTMLElement;

let state: CaptureState = IDLE_STATE;
let link: LinkRecord | null = null;
let tab: chrome.tabs.Tab | null = null;
let meeting: DetectedMeeting | null = null;
let micPermission: PermissionState | "unknown" = "unknown";
let draftTitle: string | null = null;
let consentChecked = false;
let busy = false;
let flash: string | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let checks: DecisionCheckSettings = readSettings(null);

async function send(message: BackgroundMessage): Promise<{ ok: boolean; error?: string }> {
  try {
    return (await chrome.runtime.sendMessage(message)) as { ok: boolean; error?: string };
  } catch {
    return { ok: false, error: "The extension restarted. Try again." };
  }
}

function getStreamId(tabId: number): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
      const error = chrome.runtime.lastError;
      if (error || !id) reject(new Error(error?.message ?? "Chrome did not allow recording this tab."));
      else resolve(id);
    });
  });
}

async function copyNotice(button: HTMLButtonElement): Promise<void> {
  try {
    await navigator.clipboard.writeText(CONSENT_NOTICE);
    button.textContent = "Copied";
    setTimeout(() => (button.textContent = "Copy a note for the chat"), 1800);
  } catch {
    button.textContent = "Could not copy";
  }
}

function elapsed(since: number | null): string {
  if (!since) return "0:00";
  const s = Math.max(0, Math.floor((Date.now() - since) / 1000));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = String(s % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

const STATUS_TEXT: Record<ChannelStatus, string> = {
  off: "Off",
  connecting: "Connecting",
  live: "Transcribing",
  retrying: "Reconnecting",
  failed: "Stopped",
  done: "Finished",
};

function header(): HTMLElement {
  return h(
    "header",
    { class: "head" },
    h("img", { src: "icons/icon-32.png", alt: "", width: "20", height: "20" }),
    h("span", { class: "brand" }, "Mytheus Capture"),
  );
}

function footer(): HTMLElement | null {
  if (!link) return null;
  return h(
    "footer",
    { class: "foot" },
    h("span", { class: "who" }, `${link.account.email}`, h("span", { class: "org" }, link.account.organization)),
    state.phase === "idle" || state.phase === "done" || state.phase === "error"
      ? h(
          "button",
          {
            class: "link",
            type: "button",
            onclick: async () => {
              await send({ type: "unlink" });
            },
          },
          "Disconnect",
        )
      : null,
  );
}

function viewConnect(): HTMLElement {
  return h(
    "section",
    { class: "body" },
    h("h1", {}, "Bring this call into Mytheus"),
    h(
      "p",
      { class: "lead" },
      "Capture transcribes calls on Google Meet, Microsoft Teams and Zoom in your browser, with no bot joining. Your notes, decisions and minutes land in Mytheus.",
    ),
    h(
      "button",
      {
        class: "primary",
        type: "button",
        onclick: () => void chrome.tabs.create({ url: connectUrl(chrome.runtime.id) }),
      },
      "Connect your Mytheus account",
    ),
    h("p", { class: "fine" }, "Opens Mytheus in a new tab. Sign in there if you are not already."),
  );
}

function viewNoMeeting(): HTMLElement {
  return h(
    "section",
    { class: "body" },
    h("h1", {}, "Open a call to capture it"),
    h(
      "p",
      { class: "lead" },
      "Join a call on Google Meet, Microsoft Teams or the Zoom web client in this tab, then click the Mytheus icon again.",
    ),
  );
}

function micRow(): HTMLElement {
  if (micPermission === "granted") {
    return h("p", { class: "row ok" }, h("span", { class: "label" }, "Microphone"), "Your voice is included");
  }
  return h(
    "div",
    { class: "row warn" },
    h(
      "p",
      {},
      micPermission === "denied"
        ? "Mytheus is blocked from your microphone, so your own voice will be missing. Allow it in Chrome's site settings for this extension."
        : "Allow your microphone so your own voice is in the transcript. The other people on the call are captured from the tab.",
    ),
    micPermission === "denied"
      ? null
      : h(
          "button",
          {
            class: "secondary",
            type: "button",
            onclick: () => void chrome.tabs.create({ url: chrome.runtime.getURL("permissions.html") }),
          },
          "Allow microphone",
        ),
  );
}

function viewReady(m: DetectedMeeting): HTMLElement {
  const suggested = titleFromTab(tab?.title, m);
  const title = h("input", {
    id: "title",
    type: "text",
    maxlength: "120",
    placeholder: `Name this ${m.label} call`,
    autocomplete: "off",
  });
  title.value = draftTitle ?? suggested;
  title.addEventListener("input", () => (draftTitle = title.value));

  const consent = h("input", { id: "consent", type: "checkbox" });
  consent.checked = consentChecked;
  const start = h("button", { class: "primary", type: "submit", disabled: !consentChecked || busy }, busy ? "Starting" : "Start transcribing");
  consent.addEventListener("change", () => {
    consentChecked = consent.checked;
    start.disabled = !consentChecked || busy;
  });
  const copy = h("button", { class: "link", type: "button" }, "Copy a note for the chat");
  copy.addEventListener("click", () => void copyNotice(copy));

  const form = h(
    "form",
    {
      class: "body",
      onsubmit: async (event: Event) => {
        event.preventDefault();
        if (!tab?.id || !consentChecked || busy) return;
        busy = true;
        flash = null;
        render();
        try {
          const streamId = await getStreamId(tab.id);
          const reply = await send({
            type: "start",
            tabId: tab.id,
            streamId,
            title: title.value,
            consent: true,
            useMic: micPermission === "granted",
          });
          if (!reply.ok) flash = reply.error ?? "Mytheus could not start the capture.";
        } catch (error) {
          flash = error instanceof Error ? error.message : "Mytheus could not start the capture.";
        }
        busy = false;
        render();
      },
    },
    h("h1", {}, `Capture this ${m.label} call`),
    !m.inCall
      ? h("p", { class: "fine" }, "Start once you have joined the call: Mytheus records this tab's audio from then on.")
      : null,
    h("label", { for: "title", class: "label" }, "Meeting name"),
    title,
    micRow(),
    h(
      "div",
      { class: "consent" },
      consent,
      h(
        "label",
        { for: "consent" },
        "I have told everyone on this call that Mytheus is transcribing it.",
      ),
    ),
    h("p", { class: "fine" }, "Many places require everyone's agreement before a call is recorded. ", copy),
    flash ? h("p", { class: "error", role: "alert" }, flash) : null,
    start,
  );
  return form;
}

function channelRow(name: string, status: ChannelStatus): HTMLElement {
  return h(
    "li",
    { class: `channel is-${status}` },
    h("span", {}, name),
    h("span", { class: "status" }, STATUS_TEXT[status]),
  );
}

function viewRecording(): HTMLElement {
  const elsewhere = state.tabId !== null && tab?.id !== state.tabId;
  const time = h("span", { class: "time", "aria-live": "off" }, elapsed(state.startedAt));
  if (timer) clearInterval(timer);
  timer = setInterval(() => (time.textContent = elapsed(state.startedAt)), 1000);

  const copy = h("button", { class: "link", type: "button" }, "Copy a note for the chat");
  copy.addEventListener("click", () => void copyNotice(copy));

  return h(
    "section",
    { class: "body" },
    h(
      "p",
      { class: "live", role: "status" },
      h("span", { class: "dot", "aria-hidden": "true" }),
      state.phase === "starting" ? "Starting" : state.phase === "stopping" ? "Finishing up" : "Transcribing",
      state.phase === "recording" ? time : null,
    ),
    h("h1", {}, state.title),
    elsewhere
      ? h(
          "button",
          {
            class: "link",
            type: "button",
            onclick: () => state.tabId !== null && void chrome.tabs.update(state.tabId, { active: true }),
          },
          "Go to the tab being transcribed",
        )
      : null,
    h(
      "ul",
      { class: "channels" },
      channelRow("Everyone on the call", state.channels.tab),
      channelRow("Your microphone", state.channels.mic),
    ),
    state.micNote ? h("p", { class: "fine" }, state.micNote) : null,
    h("p", { class: "fine" }, "Remind people that the call is being transcribed. ", copy),
    state.meetingUrl
      ? h("a", { class: "secondary", href: state.meetingUrl, target: "_blank", rel: "noopener" }, "Open in Mytheus")
      : null,
    h(
      "button",
      {
        class: "danger",
        type: "button",
        disabled: state.phase === "stopping",
        onclick: async () => {
          await send({ type: "stop" });
        },
      },
      state.phase === "stopping" ? "Stopping" : "Stop transcribing",
    ),
  );
}

function viewDone(): HTMLElement {
  return h(
    "section",
    { class: "body" },
    h("h1", {}, "Transcript saved"),
    h(
      "p",
      { class: "lead" },
      `${state.title} is in Mytheus. Notes, decisions and minutes appear there in a minute or two.`,
    ),
    state.error ? h("p", { class: "error", role: "alert" }, state.error) : null,
    state.meetingUrl
      ? h("a", { class: "primary", href: state.meetingUrl, target: "_blank", rel: "noopener" }, "Open the meeting")
      : null,
    h("button", { class: "secondary", type: "button", onclick: () => void send({ type: "reset" }) }, "Done"),
  );
}

function viewError(): HTMLElement {
  return h(
    "section",
    { class: "body" },
    h("h1", {}, "Capture stopped"),
    h("p", { class: "error", role: "alert" }, state.error ?? "Something went wrong."),
    h("button", { class: "primary", type: "button", onclick: () => void send({ type: "reset" }) }, "Try again"),
  );
}

async function saveChecks(next: DecisionCheckSettings): Promise<void> {
  checks = next;
  render();
  await chrome.storage.local.set({ [SETTINGS_KEY]: next });
}

/** "Decisions that follow you": the privacy switches. Off by default; while off nothing is read. */
function viewDecisionChecks(): HTMLElement {
  const master = h("input", {
    id: "checks-on",
    type: "checkbox",
    role: "switch",
    "aria-describedby": "checks-note",
  });
  master.checked = checks.enabled;
  master.addEventListener("change", () => void saveChecks({ ...checks, enabled: master.checked }));
  const siteRow = (site: Site) => {
    const box = h("input", { id: `checks-${site}`, type: "checkbox", disabled: !checks.enabled });
    box.checked = checks.sites[site];
    box.addEventListener("change", () => void saveChecks({ ...checks, sites: { ...checks.sites, [site]: box.checked } }));
    return h("li", {}, box, h("label", { for: `checks-${site}` }, SITE_LABELS[site]));
  };
  return h(
    "section",
    { class: "checks", "aria-labelledby": "checks-title" },
    h("h2", { id: "checks-title" }, "Decisions that follow you"),
    h(
      "div",
      { class: "switch-row" },
      h("label", { for: "checks-on" }, "Check what I write against decisions"),
      master,
    ),
    h(
      "p",
      { class: "fine", id: "checks-note" },
      checks.enabled
        ? "On the sites below, Mytheus reads only the paragraph you are writing, after you pause, and shows a quiet note if it goes against a decision your team confirmed. Nothing is saved unless you choose Reopen it or Dismiss."
        : "Off. While it is off, nothing you type is read or sent.",
    ),
    h("ul", { class: "sites", "aria-label": "Check on these sites" }, ...SITES.map(siteRow)),
  );
}

function render(): void {
  if (timer && state.phase !== "recording") {
    clearInterval(timer);
    timer = null;
  }
  let view: HTMLElement;
  if (state.phase === "starting" || state.phase === "recording" || state.phase === "stopping") view = viewRecording();
  else if (state.phase === "done") view = viewDone();
  else if (state.phase === "error") view = viewError();
  else if (!link) view = viewConnect();
  else if (!meeting) view = viewNoMeeting();
  else view = viewReady(meeting);
  const recording = state.phase === "starting" || state.phase === "recording" || state.phase === "stopping";
  root.replaceChildren(header(), view, link && !recording ? viewDecisionChecks() : "", footer() ?? "");
}

async function load(): Promise<void> {
  const [tabs, session, local] = await Promise.all([
    chrome.tabs.query({ active: true, currentWindow: true }),
    chrome.storage.session.get(STATE_KEY),
    chrome.storage.local.get([LINK_KEY, SETTINGS_KEY]),
  ]);
  checks = readSettings(local[SETTINGS_KEY]);
  tab = tabs[0] ?? null;
  meeting = detectMeeting(tab?.url);
  state = { ...IDLE_STATE, ...(session[STATE_KEY] as Partial<CaptureState> | undefined) };
  link = (local[LINK_KEY] as LinkRecord | undefined) ?? null;
  if (link && link.expiresAt * 1000 < Date.now()) link = null;
  try {
    const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
    micPermission = status.state;
    status.onchange = () => {
      micPermission = status.state;
      render();
    };
  } catch {
    micPermission = "unknown";
  }
  render();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "session" && changes[STATE_KEY]) {
    state = { ...IDLE_STATE, ...(changes[STATE_KEY].newValue as Partial<CaptureState> | undefined) };
    render();
  }
  if (area === "local" && changes[SETTINGS_KEY]) {
    checks = readSettings(changes[SETTINGS_KEY].newValue);
    render();
  }
  if (area === "local" && changes[LINK_KEY]) {
    link = (changes[LINK_KEY].newValue as LinkRecord | undefined) ?? null;
    render();
  }
});

void load();
