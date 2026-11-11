/**
 * The background worker's half of decision checks: the only place a check leaves the browser.
 *
 * Every message is re-gated here, whatever the content script believed: the sender must be a
 * tab on one of the three sites, and both switches (the master one and that site's) must be on,
 * read fresh from `chrome.storage.local`. Off means the message is refused and nothing is sent.
 * Calls go to the dashboard with the link token, exactly like Capture.
 */

import { CaptureApiError, checkDecisions, connectUrl, dismissDecision, reopenDecision } from "./api.ts";
import { DASHBOARD_ORIGIN } from "./config.ts";
import {
  DEFAULT_RETRY_AFTER_S,
  MAX_CHARS,
  SETTINGS_KEY,
  allowedFor,
  normalize,
  readSettings,
  siteOf,
  type CheckOutcome,
  type DecisionMessage,
} from "./decisions.ts";
import { LINK_KEY, type LinkRecord } from "./protocol.ts";

async function linkToken(): Promise<string | null> {
  const got = await chrome.storage.local.get(LINK_KEY);
  const link = got[LINK_KEY] as LinkRecord | undefined;
  if (!link || link.expiresAt * 1000 < Date.now()) return null;
  return link.token;
}

async function allowed(sender: chrome.runtime.MessageSender): Promise<boolean> {
  const site = siteOf(sender.tab?.url ?? sender.url);
  const got = await chrome.storage.local.get(SETTINGS_KEY);
  return allowedFor(readSettings(got[SETTINGS_KEY]), site);
}

function outcomeOf(error: unknown): CheckOutcome {
  if (error instanceof CaptureApiError) {
    if (error.status === 401) return { kind: "needs-link" };
    if (error.status === 429) return { kind: "rate-limited", retryAfterS: error.retryAfter ?? DEFAULT_RETRY_AFTER_S };
    if (error.status === 503) {
      return {
        kind: "not-available",
        message:
          error.code === "CAPTURE_NOT_CONFIGURED"
            ? "Mytheus is not set up for the extension on this server yet."
            : "Decision checks are not switched on for your workspace yet.",
      };
    }
    return { kind: "failed", message: "Mytheus could not check this just now." };
  }
  return { kind: "failed", message: "Mytheus could not be reached." };
}

export async function handleDecisionMessage(
  msg: DecisionMessage,
  sender: chrome.runtime.MessageSender,
): Promise<unknown> {
  if (msg.type === "decisions-connect") {
    await chrome.tabs.create({ url: connectUrl(chrome.runtime.id) });
    return null;
  }
  if (msg.type === "decisions-open") {
    const path = msg.path.startsWith("/") && !msg.path.startsWith("//") ? msg.path : "/decisions";
    await chrome.tabs.create({ url: `${DASHBOARD_ORIGIN}${path}` });
    return null;
  }
  if (!(await allowed(sender))) {
    // The switches are off for this page: nothing leaves the browser.
    return { kind: "not-available", message: "Decision checks are off for this site." } satisfies CheckOutcome;
  }
  const token = await linkToken();
  if (!token) return { kind: "needs-link" } satisfies CheckOutcome;

  if (msg.type === "decisions-check") {
    const text = normalize(msg.text).slice(0, MAX_CHARS);
    try {
      const result = await checkDecisions(token, { text, site: msg.site, placeLabel: msg.placeLabel.slice(0, 120) });
      return { kind: "result", result } as CheckOutcome;
    } catch (error) {
      return outcomeOf(error);
    }
  }
  try {
    if (msg.type === "decisions-dismiss") {
      await dismissDecision(token, { decisionId: msg.decisionId, quote: msg.quote.slice(0, 500) });
      return { ok: true };
    }
    const reopened = await reopenDecision(token, {
      decisionId: msg.decisionId,
      quote: msg.quote.slice(0, 500),
      placeLabel: msg.placeLabel.slice(0, 120),
      link: msg.link,
    });
    return { ok: true, owner: reopened.owner };
  } catch (error) {
    const outcome = outcomeOf(error);
    return {
      ok: false,
      needsLink: outcome.kind === "needs-link",
      message:
        error instanceof CaptureApiError && error.status === 409
          ? "That decision has changed since. Open it in Mytheus."
          : outcome.kind === "not-available" || outcome.kind === "failed"
            ? outcome.message
            : "Mytheus could not do that just now.",
    };
  }
}
