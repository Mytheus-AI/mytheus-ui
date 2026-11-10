/**
 * Shared shapes between the extension's pieces (popup, background worker, offscreen document,
 * content script) and the policy for `/capture/audio` close codes.
 *
 * The capture state lives in `chrome.storage.session` under `STATE_KEY`; the background worker
 * is its only writer and every view re-renders from `chrome.storage.onChanged`.
 */

import type { MeetingSource } from "./meeting-url.ts";

export const STATE_KEY = "capture";
export const LINK_KEY = "link";

export type Channel = "mic" | "tab";

/** `off`: not used (mic not allowed). `connecting`, `live`, `retrying`, `failed`, `done`. */
export type ChannelStatus = "off" | "connecting" | "live" | "retrying" | "failed" | "done";

export type CapturePhase = "idle" | "starting" | "recording" | "stopping" | "done" | "error";

export interface CaptureState {
  phase: CapturePhase;
  tabId: number | null;
  source: MeetingSource | null;
  title: string;
  meetingId: string | null;
  meetingUrl: string | null;
  /** epoch ms the audio started flowing */
  startedAt: number | null;
  /** when the user confirmed they told everyone, ISO */
  consentAt: string | null;
  channels: Record<Channel, ChannelStatus>;
  /** a plain sentence for people; never a stack trace */
  error: string | null;
  /** why the mic is off, when it is */
  micNote: string | null;
}

export const IDLE_STATE: CaptureState = {
  phase: "idle",
  tabId: null,
  source: null,
  title: "",
  meetingId: null,
  meetingUrl: null,
  startedAt: null,
  consentAt: null,
  channels: { mic: "off", tab: "off" },
  error: null,
  micNote: null,
};

export interface LinkRecord {
  token: string;
  expiresAt: number;
  account: { name: string; email: string; organization: string };
}

export interface CaptureSession {
  meetingId: string;
  meetingUrl: string;
  captureToken: string;
  /** epoch seconds */
  expiresAt: number;
  ingestUrl: string;
  title: string;
}

/** Messages to the background worker. */
export type BackgroundMessage =
  | { type: "start"; tabId: number; streamId: string; title: string; consent: true; useMic: boolean }
  | { type: "stop"; reason?: string }
  | { type: "reset" }
  | { type: "unlink" }
  | { type: "refresh-token" }
  | { type: "offscreen-status"; channel: Channel; status: ChannelStatus; detail?: string }
  | { type: "offscreen-mic"; ok: boolean; note?: string }
  | { type: "offscreen-ended"; reason: string }
  | { type: "offscreen-stopped" };

/** Messages to the offscreen document. */
export type OffscreenMessage =
  | { target: "offscreen"; type: "capture"; streamId: string; useMic: boolean }
  | { target: "offscreen"; type: "connect"; session: CaptureSession }
  | { target: "offscreen"; type: "token"; captureToken: string; expiresAt: number }
  | { target: "offscreen"; type: "stop" };

/** Sent by the dashboard's /capture/connect page through `externally_connectable`. */
export interface LinkMessage {
  type: "mytheus.capture.link";
  token: string;
  expiresAt: number;
  account: { name: string; email: string; organization: string };
}

export function isLinkMessage(value: unknown): value is LinkMessage {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  const account = v.account as Record<string, unknown> | undefined;
  return (
    v.type === "mytheus.capture.link" &&
    typeof v.token === "string" &&
    v.token.split(".").length === 3 &&
    v.token.length < 4096 &&
    typeof v.expiresAt === "number" &&
    !!account &&
    typeof account.name === "string" &&
    typeof account.email === "string" &&
    typeof account.organization === "string"
  );
}

/** What a channel does after its socket closes. Mirrors `capture_in.py`'s close codes. */
export type CloseAction = "done" | "refresh" | "retry" | "fatal";

export function closeAction(code: number, stopping: boolean): CloseAction {
  if (stopping) return "done";
  switch (code) {
    case 1000: // normal: stop received or stream ended
      return "done";
    case 4401: // token missing, invalid or expired
      return "refresh";
    case 1007: // odd frame length: our bug, retrying repeats it
    case 1009: // frame too large
    case 4400: // bad init frame
    case 4403: // meeting not in org
    case 4409: // superseded by a newer connection of ours
    case 4451: // compliance gate closed
    case 1008: // refused at the upgrade (capture not configured, origin not allowed)
      return "fatal";
    default: // 1001 shutting down, 1006 network, 1011 internal, 4408 timeout
      return "retry";
  }
}

/** Exponential backoff with jitter, 1 s doubling to 15 s. */
export function backoffMs(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(15000, 1000 * 2 ** Math.max(0, attempt));
  return Math.round(base * (0.75 + random() * 0.5));
}

export const CLOSE_REASONS: Record<number, string> = {
  1008: "Capture is not switched on for your workspace yet.",
  4403: "This meeting does not belong to your workspace.",
  4451: "Transcription is paused for your workspace.",
  4400: "The extension sent something the server did not expect. Update the extension.",
  1007: "The extension sent audio the server could not read. Update the extension.",
  1009: "The extension sent audio the server could not read. Update the extension.",
};

/** A short, human message for a failed channel. */
export function describeClose(code: number): string {
  return CLOSE_REASONS[code] ?? "The connection to Mytheus dropped.";
}

/** The note people can paste into the meeting chat. Plain, and says how to opt out. */
export const CONSENT_NOTICE =
  "Heads up: I'm using Mytheus to transcribe this call so we get notes, decisions and " +
  "action items afterwards. Let me know if you'd rather I stop.";
