/**
 * The extension's calls to the dashboard (`mytheus-ui`'s `/api/capture/session/*` routes).
 *
 * Every call carries the link token the user created on the dashboard's /capture/connect page.
 * The dashboard verifies it, reuses the user's own Clerk session behind it (signing out of
 * Mytheus ends it), and talks to core-api as that user. The extension never sees a Clerk token,
 * an org id or a Deepgram key.
 */

import { DASHBOARD_ORIGIN } from "./config.ts";
import type { CaptureSession } from "./protocol.ts";
import type { MeetingSource } from "./meeting-url.ts";

export class CaptureApiError extends Error {
  readonly status: number;
  readonly code: string;
  /** Seconds to wait, on a 429. */
  readonly retryAfter: number | null;
  constructor(status: number, code: string, message: string, retryAfter: number | null = null) {
    super(message);
    this.name = "CaptureApiError";
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
  /** The link is gone (signed out, expired, revoked): connect the extension again. */
  get needsRelink(): boolean {
    return this.status === 401;
  }
}

const MESSAGES: Record<string, string> = {
  LINK_EXPIRED: "Your Mytheus sign-in has ended. Connect the extension again.",
  AUTH_REQUIRED: "Your Mytheus sign-in has ended. Connect the extension again.",
  CAPTURE_NOT_CONFIGURED: "Capture is not switched on for your workspace yet.",
  CONSENT_REQUIRED: "Confirm that you told everyone on the call first.",
  MEETING_ENDED: "This capture has already ended.",
  NOT_FOUND: "That meeting is not in your workspace.",
  VALIDATION_FAILED: "Mytheus could not accept that meeting name.",
  RATE_LIMITED: "Mytheus is checking a lot right now. It will try again shortly.",
  CHECK_NOT_CONNECTED: "Decision checks are not switched on for your workspace yet.",
  NOT_CONFIRMED: "That decision has changed since; open it in Mytheus.",
};

async function call<T>(path: string, linkToken: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${DASHBOARD_ORIGIN}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        // Not `Authorization`: the dashboard's Clerk middleware would parse that as a Clerk JWT.
        "X-Mytheus-Capture-Link": linkToken,
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "omit",
      cache: "no-store",
    });
  } catch {
    throw new CaptureApiError(0, "NETWORK", "Mytheus could not be reached. Check your connection.");
  }
  let parsed: Record<string, unknown> = {};
  try {
    parsed = (await response.json()) as Record<string, unknown>;
  } catch {
    // A proxy error page: fall through with the status alone.
  }
  if (!response.ok) {
    const code = typeof parsed.code === "string" ? parsed.code : `HTTP_${response.status}`;
    const retry = typeof parsed.retry_after === "number" ? parsed.retry_after : Number(response.headers.get("Retry-After"));
    throw new CaptureApiError(
      response.status,
      code,
      MESSAGES[code] ?? "Mytheus could not start the capture. Try again in a moment.",
      Number.isFinite(retry) && retry > 0 ? retry : null,
    );
  }
  return parsed as T;
}

interface SessionWire {
  meeting_id: string;
  meeting_url: string;
  capture_token: string;
  expires_at: number;
  ingest_url: string;
  title: string;
}

function toSession(w: SessionWire): CaptureSession {
  return {
    meetingId: w.meeting_id,
    meetingUrl: w.meeting_url,
    captureToken: w.capture_token,
    expiresAt: w.expires_at,
    ingestUrl: w.ingest_url,
    title: w.title,
  };
}

export async function startSession(
  linkToken: string,
  input: { source: MeetingSource; title: string; consentAt: string; requestId: string },
): Promise<CaptureSession> {
  return toSession(
    await call<SessionWire>("/api/capture/session/start", linkToken, {
      source: input.source,
      title: input.title,
      consent: true,
      consent_at: input.consentAt,
      client_request_id: input.requestId,
    }),
  );
}

export async function refreshSession(
  linkToken: string,
  input: { meetingId: string; source: MeetingSource; consentAt: string },
): Promise<CaptureSession> {
  return toSession(
    await call<SessionWire>("/api/capture/session/refresh", linkToken, {
      meeting_id: input.meetingId,
      source: input.source,
      consent_at: input.consentAt,
    }),
  );
}

export async function endSession(linkToken: string, meetingId: string): Promise<void> {
  await call<unknown>("/api/capture/session/end", linkToken, { meeting_id: meetingId });
}

export interface LinkStatus {
  linked: boolean;
  configured: boolean;
}

export async function linkStatus(linkToken: string): Promise<LinkStatus> {
  return call<LinkStatus>("/api/capture/session/status", linkToken);
}

export function connectUrl(extensionId: string): string {
  return `${DASHBOARD_ORIGIN}/capture/connect?ext=${encodeURIComponent(extensionId)}`;
}

// ------------------------------------------------------------------ decision checks

/** `POST /api/capture/decisions/check`: the paragraph being written, checked against decisions. */
export async function checkDecisions(
  linkToken: string,
  input: { text: string; site: string; placeLabel: string },
): Promise<unknown> {
  return call<unknown>("/api/capture/decisions/check", linkToken, {
    text: input.text,
    site: input.site,
    place_label: input.placeLabel,
  });
}

/** `POST /api/capture/decisions/dismiss`: never flag this sentence against this decision again. */
export async function dismissDecision(linkToken: string, input: { decisionId: string; quote: string }): Promise<void> {
  await call<unknown>("/api/capture/decisions/dismiss", linkToken, { decision_id: input.decisionId, quote: input.quote });
}

/** `POST /api/capture/decisions/reopen`: ask the decision's owner to reopen it. */
export async function reopenDecision(
  linkToken: string,
  input: { decisionId: string; quote: string; placeLabel: string; link: string | null },
): Promise<{ owner: string | null; status: string }> {
  const body: Record<string, unknown> = {
    decision_id: input.decisionId,
    quote: input.quote,
    place_label: input.placeLabel,
  };
  if (input.link) body.link = input.link;
  const res = await call<{ owner?: { name?: string } | null; status?: string }>(
    "/api/capture/decisions/reopen",
    linkToken,
    body,
  );
  return { owner: res.owner?.name ?? null, status: res.status ?? "pending" };
}
