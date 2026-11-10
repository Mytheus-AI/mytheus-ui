/**
 * Notification preferences, as the settings section shows them (Phase P11, plan 3.8/3.9; P11
 * contract sections 3 and 5). notification-service keeps one row per channel with `enabled` and
 * `max_priority` (deliver when the alert's priority <= max_priority). The section exposes:
 *   - in-app: always on, every priority (the meeting sidebar and the gateway queue);
 *   - email: on or off, and "Urgent only" (max_priority 1, red conflicts) or "All alerts" (3);
 *   - Slack: shown, disabled, until integration-service connects Slack in P12.
 * Pure helpers, so the defaults and the mapping are testable without the server.
 */

export type Channel = "in_app" | "email" | "slack";
export type MaxPriority = 1 | 2 | 3;

export interface ChannelPreference {
  channel: Channel;
  enabled: boolean;
  max_priority: MaxPriority;
}

export type EmailMode = "urgent" | "all";

export interface PreferencesView {
  emailEnabled: boolean;
  emailMode: EmailMode;
}

/** The server's defaults (contract section 3): in-app on at 3; email opt-in (off) and Slack off,
 *  both at 1 (urgent only) once turned on. */
export const DEFAULT_PREFERENCES: ChannelPreference[] = [
  { channel: "in_app", enabled: true, max_priority: 3 },
  { channel: "email", enabled: false, max_priority: 1 },
  { channel: "slack", enabled: false, max_priority: 1 },
];

const isChannel = (v: unknown): v is Channel => v === "in_app" || v === "email" || v === "slack";
const isMax = (v: unknown): v is MaxPriority => v === 1 || v === 2 || v === 3;

/** Merges whatever the server returned over the defaults, ignoring anything malformed. */
export function mergePreferences(rows: unknown): ChannelPreference[] {
  const byChannel = new Map(DEFAULT_PREFERENCES.map((p) => [p.channel, { ...p }]));
  if (Array.isArray(rows)) {
    for (const r of rows) {
      if (!r || typeof r !== "object") continue;
      const { channel, enabled, max_priority } = r as Record<string, unknown>;
      if (!isChannel(channel)) continue;
      const current = byChannel.get(channel)!;
      byChannel.set(channel, {
        channel,
        enabled: typeof enabled === "boolean" ? enabled : current.enabled,
        max_priority: isMax(max_priority) ? max_priority : current.max_priority,
      });
    }
  }
  // In-app is the delivery the room depends on; it cannot be turned off here.
  byChannel.set("in_app", { channel: "in_app", enabled: true, max_priority: 3 });
  return DEFAULT_PREFERENCES.map((p) => byChannel.get(p.channel)!);
}

export function toView(prefs: ChannelPreference[]): PreferencesView {
  const email = prefs.find((p) => p.channel === "email") ?? DEFAULT_PREFERENCES[1];
  return { emailEnabled: email.enabled, emailMode: email.max_priority === 1 ? "urgent" : "all" };
}

/** The rows to PUT for a view. Slack keeps its stored priority and stays off until P12. */
export function fromView(view: PreferencesView, current: ChannelPreference[]): ChannelPreference[] {
  const slack = current.find((p) => p.channel === "slack") ?? DEFAULT_PREFERENCES[2];
  return [
    { channel: "in_app", enabled: true, max_priority: 3 },
    { channel: "email", enabled: view.emailEnabled, max_priority: view.emailMode === "urgent" ? 1 : 3 },
    { channel: "slack", enabled: false, max_priority: slack.max_priority },
  ];
}
