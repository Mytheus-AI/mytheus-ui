"use server";

import { ApiError } from "@/lib/api/client";
import {
  patchNotification,
  putNotificationPreferences,
  type NotificationPreference,
} from "@/lib/api/notifications";

/* Mark read / Dismiss for ProactiveAgent alerts, and the notification preferences save (Phase
   P11, plan 3.9; P11 contract sections 3 and 5). An alert is its recipient's own notification:
   neither verb commits or tells anyone anything, and notification-service answers 404 to anyone
   but the owner. Nothing about the tenant or the user is taken from the input. */

export type AlertVerb = "read" | "dismissed";
export type AlertResult = { ok: true } | { ok: false; message: string; gone?: boolean };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function transition(id: string, status: AlertVerb): Promise<AlertResult> {
  if (!UUID.test(id)) return { ok: false, message: "That alert is no longer valid.", gone: true };
  // An alert can reach the socket a moment before notification-service has written its row (the
  // gateway and the consumer read agent-results independently), so a 404 is retried briefly
  // before it is believed, as for suggestions and context fills.
  for (let attempt = 0; ; attempt++) {
    try {
      await patchNotification(id, status);
      return { ok: true };
    } catch (err) {
      if (err instanceof ApiError && err.status === 404 && attempt < 3) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      if (err instanceof ApiError) {
        if (err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
        if (err.status === 404) return { ok: false, message: "That alert is no longer here.", gone: true };
      }
      const verb = status === "read" ? "marked as read" : "dismissed";
      return { ok: false, message: `The alert couldn't be ${verb} just now. Try again in a moment.` };
    }
  }
}

export async function markAlertRead(id: string): Promise<AlertResult> {
  return transition(id, "read");
}

export async function dismissAlert(id: string): Promise<AlertResult> {
  return transition(id, "dismissed");
}

export type PreferencesResult = { ok: true; items: NotificationPreference[] } | { ok: false; message: string };

const CHANNELS = new Set(["in_app", "email", "slack"]);

/** Saves the caller's own channel preferences. In-app is always on; Slack stays off until P12. */
export async function saveNotificationPreferences(input: NotificationPreference[]): Promise<PreferencesResult> {
  const items: NotificationPreference[] = [];
  for (const p of Array.isArray(input) ? input : []) {
    if (!p || !CHANNELS.has(p.channel)) continue;
    const max = p.max_priority === 1 || p.max_priority === 2 || p.max_priority === 3 ? p.max_priority : 1;
    if (p.channel === "in_app") items.push({ channel: "in_app", enabled: true, max_priority: 3 });
    else if (p.channel === "slack") items.push({ channel: "slack", enabled: false, max_priority: max });
    else items.push({ channel: "email", enabled: Boolean(p.enabled), max_priority: max });
  }
  try {
    const saved = await putNotificationPreferences(items);
    return { ok: true, items: Array.isArray(saved?.items) ? saved.items : items };
  } catch (err) {
    if (err instanceof ApiError && err.isAuthFailure) return { ok: false, message: "Your session expired. Sign in again." };
    return { ok: false, message: "Your preferences couldn't be saved just now. Try again in a moment." };
  }
}
