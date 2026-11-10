/**
 * The background service worker: the one owner of capture state.
 *
 * Flow of a capture:
 * 1. The popup, on the user's click (the gesture `chrome.tabCapture` requires), gets a stream id
 *    for the meeting tab and sends `start` with the title and the consent confirmation.
 * 2. This worker opens the offscreen document, which takes the tab audio (and the mic)
 *    immediately so the stream id cannot expire, and keeps the meeting audible to the user.
 *    Nothing is sent anywhere yet.
 * 3. It asks the dashboard to start a capture session: the dashboard creates the external
 *    meeting in Mytheus and returns a short-lived capture token and the ingest URL.
 * 4. The offscreen document connects both channels to `/capture/audio` and streams.
 * 5. Stop (popup, the in-page pill, the tab closing or leaving the meeting, the tab audio
 *    ending) closes both channels cleanly, then tells the dashboard the meeting ended, which
 *    is what produces its notes and minutes.
 *
 * State lives in `chrome.storage.session` (survives this worker being suspended, cleared when
 * the browser closes); the link token in `chrome.storage.local`.
 */

import { CaptureApiError, endSession, refreshSession, startSession } from "./lib/api.ts";
import { DASHBOARD_ORIGIN } from "./lib/config.ts";
import { detectMeeting, SOURCE_LABELS } from "./lib/meeting-url.ts";
import {
  IDLE_STATE,
  LINK_KEY,
  STATE_KEY,
  isLinkMessage,
  type BackgroundMessage,
  type CaptureSession,
  type CaptureState,
  type Channel,
  type LinkRecord,
  type OffscreenMessage,
} from "./lib/protocol.ts";

const SESSION_KEY = "captureSession";
const OFFSCREEN_URL = "offscreen.html";
const STOP_TIMEOUT_MS = 8000;

// ------------------------------------------------------------------ storage helpers

async function getState(): Promise<CaptureState> {
  const got = await chrome.storage.session.get(STATE_KEY);
  return { ...IDLE_STATE, ...(got[STATE_KEY] as Partial<CaptureState> | undefined) };
}

async function setState(patch: Partial<CaptureState>): Promise<CaptureState> {
  const next = { ...(await getState()), ...patch };
  await chrome.storage.session.set({ [STATE_KEY]: next });
  await pushIndicator(next);
  return next;
}

async function getLink(): Promise<LinkRecord | null> {
  const got = await chrome.storage.local.get(LINK_KEY);
  const link = got[LINK_KEY] as LinkRecord | undefined;
  if (!link) return null;
  if (link.expiresAt * 1000 < Date.now()) {
    await chrome.storage.local.remove(LINK_KEY);
    return null;
  }
  return link;
}

async function getSession(): Promise<CaptureSession | null> {
  const got = await chrome.storage.session.get(SESSION_KEY);
  return (got[SESSION_KEY] as CaptureSession | undefined) ?? null;
}

// ------------------------------------------------------------------ indicator

async function pushIndicator(state: CaptureState): Promise<void> {
  if (state.tabId === null) return;
  const showing = state.phase === "starting" || state.phase === "recording" || state.phase === "stopping";
  try {
    await chrome.action.setBadgeText({ tabId: state.tabId, text: showing ? "REC" : "" });
    await chrome.action.setBadgeBackgroundColor({ tabId: state.tabId, color: "#B42318" });
    await chrome.action.setTitle({
      tabId: state.tabId,
      title: showing ? "Mytheus is transcribing this tab" : "Mytheus Capture",
    });
  } catch {
    // The tab is gone.
  }
  try {
    await chrome.tabs.sendMessage(state.tabId, { type: "indicator", state });
  } catch {
    // No content script in that tab (yet): it asks for the state when it loads.
  }
}

// ------------------------------------------------------------------ offscreen document

async function hasOffscreen(): Promise<boolean> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)],
  });
  return contexts.length > 0;
}

async function openOffscreen(): Promise<void> {
  if (await hasOffscreen()) await chrome.offscreen.closeDocument();
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: [chrome.offscreen.Reason.USER_MEDIA],
    justification: "Records the meeting tab and microphone the user chose to transcribe.",
  });
}

async function closeOffscreen(): Promise<void> {
  if (await hasOffscreen()) await chrome.offscreen.closeDocument();
}

type WithoutTarget<T> = T extends unknown ? Omit<T, "target"> : never;

function toOffscreen(message: WithoutTarget<OffscreenMessage>): Promise<unknown> {
  return chrome.runtime.sendMessage({ target: "offscreen", ...message });
}

// ------------------------------------------------------------------ start / stop

let stopWaiter: (() => void) | null = null;

async function start(msg: Extract<BackgroundMessage, { type: "start" }>): Promise<void> {
  const current = await getState();
  if (current.phase === "starting" || current.phase === "recording" || current.phase === "stopping") {
    throw new Error("A capture is already running. Stop it first.");
  }
  const tab = await chrome.tabs.get(msg.tabId);
  const meeting = detectMeeting(tab.url);
  if (!meeting) throw new Error("This tab is not a Google Meet, Teams or Zoom web meeting.");
  const link = await getLink();
  if (!link) throw new Error("Connect the extension to your Mytheus account first.");

  const consentAt = new Date().toISOString();
  const title = msg.title.trim().slice(0, 120);
  await chrome.storage.session.remove(SESSION_KEY);
  await setState({
    ...IDLE_STATE,
    phase: "starting",
    tabId: msg.tabId,
    source: meeting.source,
    title: title || `${SOURCE_LABELS[meeting.source]} call`,
    consentAt,
    channels: { mic: msg.useMic ? "connecting" : "off", tab: "connecting" },
  });

  // Take the audio first: the stream id is only good for a few seconds.
  await openOffscreen();
  const took = (await toOffscreen({ type: "capture", streamId: msg.streamId, useMic: msg.useMic })) as
    | { ok?: boolean }
    | undefined;
  if (!took?.ok) {
    await closeOffscreen();
    await setState({
      phase: "error",
      channels: { mic: "off", tab: "off" },
      error: "Chrome did not let Mytheus record this tab. Click the Mytheus icon on the meeting tab and try again.",
    });
    return;
  }

  let session: CaptureSession;
  try {
    session = await startSession(link.token, {
      source: meeting.source,
      title,
      consentAt,
      requestId: crypto.randomUUID(),
    });
  } catch (error) {
    await closeOffscreen();
    if (error instanceof CaptureApiError && error.needsRelink) await chrome.storage.local.remove(LINK_KEY);
    await setState({ phase: "error", error: messageOf(error), channels: { mic: "off", tab: "off" } });
    return;
  }
  await chrome.storage.session.set({ [SESSION_KEY]: session });
  await setState({
    phase: "recording",
    title: session.title,
    meetingId: session.meetingId,
    meetingUrl: session.meetingUrl,
    startedAt: Date.now(),
  });
  await toOffscreen({ type: "connect", session });
}

async function stop(reason?: string): Promise<void> {
  const state = await getState();
  if (state.phase !== "starting" && state.phase !== "recording") return;
  await setState({ phase: "stopping" });

  if (await hasOffscreen()) {
    const stopped = new Promise<void>((resolve) => {
      stopWaiter = resolve;
      setTimeout(resolve, STOP_TIMEOUT_MS);
    });
    try {
      await toOffscreen({ type: "stop" });
      await stopped;
    } catch {
      // The document already went away.
    }
    stopWaiter = null;
    await closeOffscreen();
  }

  const session = await getSession();
  const link = await getLink();
  let error: string | null = reason ?? null;
  if (session && link) {
    try {
      await endSession(link.token, session.meetingId);
    } catch (e) {
      // The transcript is safe either way; only the "ended" mark (and so the minutes) waits.
      error = `The transcript is saved, but Mytheus could not mark the meeting as ended. ${messageOf(e)}`;
    }
  }
  await chrome.storage.session.remove(SESSION_KEY);
  await setState({
    phase: session ? "done" : error ? "error" : "idle",
    channels: { mic: "off", tab: "off" },
    error,
  });
}

async function refreshToken(): Promise<{ captureToken: string; expiresAt: number }> {
  const [state, session, link] = await Promise.all([getState(), getSession(), getLink()]);
  if (!session || !link || !state.source || !state.consentAt) {
    throw new Error("No capture is running.");
  }
  const fresh = await refreshSession(link.token, {
    meetingId: session.meetingId,
    source: state.source,
    consentAt: state.consentAt,
  });
  const next = { ...session, captureToken: fresh.captureToken, expiresAt: fresh.expiresAt };
  await chrome.storage.session.set({ [SESSION_KEY]: next });
  return { captureToken: fresh.captureToken, expiresAt: fresh.expiresAt };
}

function messageOf(error: unknown): string {
  if (error instanceof CaptureApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Try again.";
}

// ------------------------------------------------------------------ messages

chrome.runtime.onMessage.addListener((raw: unknown, sender, sendResponse) => {
  const msg = raw as (BackgroundMessage & { target?: string }) | { type: "indicator-query" };
  if ((msg as { target?: string }).target === "offscreen") return false; // not ours
  if (sender.id !== chrome.runtime.id) return false;

  const reply = (work: Promise<unknown>) => {
    work.then(
      (value) => sendResponse({ ok: true, value }),
      (error: unknown) => sendResponse({ ok: false, error: messageOf(error) }),
    );
    return true; // async response
  };

  switch (msg.type) {
    case "start":
      return reply(start(msg));
    case "stop":
      return reply(stop(msg.reason));
    case "reset":
      return reply(
        (async () => {
          const state = await getState();
          if (state.phase === "done" || state.phase === "error" || state.phase === "idle") {
            await setState({ ...IDLE_STATE, tabId: state.tabId }); // clears that tab's badge
            await chrome.storage.session.set({ [STATE_KEY]: IDLE_STATE });
          }
        })(),
      );
    case "unlink":
      return reply(chrome.storage.local.remove(LINK_KEY));
    case "refresh-token":
      return reply(refreshToken());
    case "indicator-query":
      return reply(
        (async () => {
          const state = await getState();
          return sender.tab?.id !== undefined && sender.tab.id === state.tabId ? state : null;
        })(),
      );
    case "offscreen-status":
      return reply(
        (async () => {
          const state = await getState();
          const channels = { ...state.channels, [msg.channel]: msg.status } as Record<Channel, typeof msg.status>;
          await setState({ channels });
          // Without the tab channel there is no call to transcribe: stop and say why.
          if (msg.channel === "tab" && msg.status === "failed") await stop(msg.detail);
        })(),
      );
    case "offscreen-mic":
      return reply(
        (async () => {
          const state = await getState();
          await setState(
            msg.ok
              ? { micNote: null }
              : { micNote: msg.note ?? "Your microphone is off.", channels: { ...state.channels, mic: "off" } },
          );
        })(),
      );
    case "offscreen-ended":
      return reply(stop(msg.reason));
    case "offscreen-stopped":
      stopWaiter?.();
      sendResponse({ ok: true });
      return false;
    default:
      return false;
  }
});

// The dashboard's /capture/connect page hands over the link token. Only that origin can reach
// this listener (`externally_connectable` in the manifest), and it is checked again here.
chrome.runtime.onMessageExternal.addListener((raw: unknown, sender, sendResponse) => {
  const origin = sender.origin ?? (sender.url ? new URL(sender.url).origin : "");
  if (origin !== DASHBOARD_ORIGIN) {
    sendResponse({ ok: false, error: "origin not allowed" });
    return false;
  }
  if (raw && typeof raw === "object" && (raw as { type?: unknown }).type === "mytheus.capture.ping") {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    return false;
  }
  if (!isLinkMessage(raw)) {
    sendResponse({ ok: false, error: "malformed link" });
    return false;
  }
  const record: LinkRecord = { token: raw.token, expiresAt: raw.expiresAt, account: raw.account };
  chrome.storage.local.set({ [LINK_KEY]: record }).then(
    () => sendResponse({ ok: true }),
    () => sendResponse({ ok: false, error: "could not save" }),
  );
  return true;
});

// ------------------------------------------------------------------ tab lifecycle

chrome.tabs.onRemoved.addListener((tabId) => {
  void getState().then((s) => (s.tabId === tabId ? stop("The meeting tab was closed.") : undefined));
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (!info.url) return;
  void getState().then((s) => {
    if (s.tabId !== tabId || (s.phase !== "recording" && s.phase !== "starting")) return;
    const meeting = detectMeeting(info.url);
    if (!meeting || meeting.source !== s.source) return stop("You left the meeting page.");
    return undefined;
  });
});

// A browser restart loses the offscreen document: never leave a stale "recording" behind.
chrome.runtime.onStartup.addListener(() => {
  void chrome.storage.session.set({ [STATE_KEY]: IDLE_STATE });
});
