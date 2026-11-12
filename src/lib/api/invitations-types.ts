/* Meeting invitations by email and the meeting's calendar (core-api, ADR-0043). Wire shapes as
   core-api returns them (snake_case). Shared by the server reads, the Server Actions and the
   client card, so it imports nothing server-only. */

export type InvitationStatus = "pending" | "sent" | "failed" | "not_configured";
export type InvitationKind = "invite" | "update" | "cancel";

export type Invitation = {
  id: string;
  email: string;
  user_id: string | null;
  name: string | null;
  status: InvitationStatus;
  /** Why the last delivery failed, e.g. `resend_http_500`. */
  last_error: string | null;
  last_kind: InvitationKind;
  send_count: number;
  sent_at: string | null;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CalendarLinks = {
  /** `/api/v1/meetings/{id}/calendar.ics` (signed in); the web app serves it at `/api/meetings/{id}/calendar`. */
  ics_path: string;
  /** The no-sign-in link from the emails; null when the server has no calendar key. */
  public_ics_url: string | null;
  google_url: string;
  outlook_url: string;
};

export type InvitationList = {
  meeting_id: string;
  /** The host, the creator or a workspace admin. */
  can_invite: boolean;
  /** Null for someone who cannot invite, or when the server could not be asked. */
  email_configured: boolean | null;
  join_url: string;
  /** Null for a meeting with no time yet. */
  calendar: CalendarLinks | null;
  items: Invitation[];
};

export type InvitationSendResult = {
  email_configured: boolean;
  invitations: Invitation[];
  sent: number;
  failed: number;
  not_configured: number;
  participants_added: number;
};

export const INVITE_LIMITS = { maxRecipients: 50, messageMax: 500 } as const;

/** What a person sees for a delivery state. */
export function statusLabel(inv: Pick<Invitation, "status" | "last_kind">): string {
  if (inv.status === "sent") {
    return inv.last_kind === "update" ? "Update sent" : inv.last_kind === "cancel" ? "Cancellation sent" : "Sent";
  }
  if (inv.status === "failed") return "Failed";
  if (inv.status === "not_configured") return "Not emailed";
  return "Sending";
}

/** The provider's reason, said plainly. */
export function failureText(code: string | null): string {
  if (!code) return "The email couldn't be delivered.";
  if (code === "email_service_unavailable") return "The email service didn't answer.";
  if (code.startsWith("resend_http_4")) return "The email provider refused it.";
  if (code.startsWith("resend_http_5") || code.startsWith("resend_unreachable")) return "The email provider was unavailable.";
  return "The email couldn't be delivered.";
}

/** "Emailed Raj and Priya." style summary for a toast; names fall back to addresses. */
export function sentSummary(result: InvitationSendResult): string {
  const names = result.invitations.filter((i) => i.status === "sent").map((i) => i.name ?? i.email);
  if (names.length === 0) return "";
  const shown = names.slice(0, 3);
  const rest = names.length - shown.length;
  const list = rest > 0 ? `${shown.join(", ")} and ${rest} more` : shown.length > 1 ? `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}` : shown[0];
  return `Emailed ${list}.`;
}
