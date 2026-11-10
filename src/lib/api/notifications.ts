/**
 * notification-service (Phase P11, plan 10-13 section 3.8; P11 contract section 3). The public
 * surface is `/notifications` (api-gateway routes the prefix to notification-service), not
 * `/api/v1/...`.
 *
 *   GET   /notifications?meeting_id=&status=   the caller's own rows, newest first (priority then
 *                                              time when meeting_id is given); cursor-paginated
 *   PATCH /notifications/{id}                  {status: "read" | "dismissed"}; owner only (404
 *                                              otherwise), idempotent
 *   GET   /notifications/preferences           the caller's own channel preferences
 *   PUT   /notifications/preferences           replace the caller's own channel preferences
 *
 * HAND-WRITTEN TYPES. The notification-service PR that adds these routes is built in parallel
 * with this one, so its OpenAPI document is not on main yet. Once it merges, run
 * `npm run generate:api` and replace these with the generated schemas like the other modules.
 *
 * SERVER-ONLY, inherited from `lib/api/client.ts`.
 */

import { api } from "@/lib/api/client";

export type NotificationStatus = "unread" | "read" | "dismissed";
export type NotificationChannel = "in_app" | "email" | "slack";

/** One `notification_log` row. For an agent alert, `payload` is the alert object (contract 1). */
export interface NotificationRow {
  id: string;
  meeting_id: string | null;
  source: "agent_alert" | "notification";
  alert_type: "conflict" | "workload" | "dependency" | "missing_stakeholder" | null;
  priority: 1 | 2 | 3;
  title: string;
  body: string;
  link: string | null;
  payload: Record<string, unknown> | null;
  status: NotificationStatus;
  created_at: string;
  read_at: string | null;
  dismissed_at: string | null;
}

export interface NotificationPage {
  items: NotificationRow[];
  next_cursor: string | null;
}

/** Deliver on this channel when the notification's priority <= max_priority (1 = urgent only). */
export interface NotificationPreference {
  channel: NotificationChannel;
  enabled: boolean;
  max_priority: 1 | 2 | 3;
}

export interface NotificationPreferences {
  items: NotificationPreference[];
  /** Whether this server has an email provider (`EMAIL_PROVIDER`); absent from older servers. */
  email_configured?: boolean;
  email_provider?: string | null;
}

export async function fetchMeetingAlerts(meetingId: string): Promise<NotificationPage> {
  return api<NotificationPage>("/notifications", { query: { meeting_id: meetingId } });
}

export async function patchNotification(id: string, status: "read" | "dismissed"): Promise<NotificationRow> {
  return api<NotificationRow>(`/notifications/${encodeURIComponent(id)}`, { method: "PATCH", body: { status } });
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  return api<NotificationPreferences>("/notifications/preferences");
}

export async function putNotificationPreferences(items: NotificationPreference[]): Promise<NotificationPreferences> {
  return api<NotificationPreferences>("/notifications/preferences", { method: "PUT", body: { items } });
}
