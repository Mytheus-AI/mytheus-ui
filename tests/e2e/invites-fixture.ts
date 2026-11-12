import type { InvitationList, Invitation } from "../../src/lib/api/invitations-types";
import type { InvitationsRead } from "../../src/lib/api/invitations";

/* "Invite and share" fixtures (ADR-0043): one meeting, Maya hosts, three people invited. */

const at = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

function inv(id: string, name: string, status: Invitation["status"], extra: Partial<Invitation> = {}): Invitation {
  return {
    id: `inv-${id}`,
    email: `${id}@example.com`,
    user_id: `u-${id}`,
    name,
    status,
    last_error: null,
    last_kind: "invite",
    send_count: 1,
    sent_at: status === "sent" ? at(42) : null,
    invited_by: "u-maya",
    created_at: at(50),
    updated_at: at(42),
    ...extra,
  };
}

const CALENDAR = {
  ics_path: "/api/v1/meetings/m-1/calendar.ics",
  public_ics_url: "https://api.mytheus.cloud/api/v1/public/calendar/abc.def.ics",
  google_url: "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Pricing%20review",
  outlook_url: "https://outlook.office.com/calendar/0/deeplink/compose?subject=Pricing%20review",
};

const BASE: InvitationList = {
  meeting_id: "m-1",
  can_invite: true,
  email_configured: true,
  join_url: "https://dashboard.mytheus.cloud/meetings/m-1/join",
  calendar: CALENDAR,
  items: [],
};

export const INVITES: Record<string, InvitationsRead> = {
  host: {
    ok: true,
    data: {
      ...BASE,
      items: [
        inv("raj", "Raj Patel", "sent"),
        inv("priya", "Priya Nair", "sent", { last_kind: "update", sent_at: at(5) }),
        inv("diego", "Diego Alvarez", "failed", { last_error: "resend_http_500" }),
      ],
    },
  },
  empty: { ok: true, data: BASE },
  notConfigured: {
    ok: true,
    data: { ...BASE, email_configured: false, items: [inv("raj", "Raj Patel", "not_configured"), inv("sarah", "Sarah Okafor", "not_configured")] },
  },
  member: { ok: true, data: { ...BASE, can_invite: false, email_configured: null } },
  noTime: { ok: true, data: { ...BASE, calendar: null } },
  error: { ok: false, status: 503 },
};
