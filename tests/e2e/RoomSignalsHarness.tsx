import type { ReactNode } from "react";
import { OrgProvider } from "../../src/lib/org-context";
import { Toaster } from "../../src/components/ui/Toaster";
import { InboxView } from "../../src/components/inbox/InboxView";
import { AfterSignalsSection } from "../../src/components/room-signals/AfterSignalsSection";
import { AgreementCard } from "../../src/components/room-signals/AgreementCard";
import { LateComposer } from "../../src/components/room-signals/LateComposer";
import { describeNotification } from "../../src/components/notifications/alert-copy";
import { toInboxItems } from "../../src/lib/inbox";
import type { AfterSignals, AgreementCheck, DecisionAgreement, LastWordNudge } from "../../src/lib/api/room-signals-types";
import { RESUME } from "./room-signals-fixture";

/* The a3 room-signals UI as the app renders it: the org context, the `.mx-app.mx-meet` theme root
   (light or dark), the toast surface. Fixed data with the house's sample people. */

export const MEETING = "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const DECISION = "33333333-3333-4333-8333-333333333333";
const NUDGE = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const CHECK = "7f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const NOW = "2026-11-11T12:00:00Z";

export const NUDGE_ROW: LastWordNudge = {
  id: NUDGE,
  meeting_id: MEETING,
  meeting_title: "Pricing review",
  kind: "cut_off",
  topic: "pricing for the enterprise tier",
  prompt: "You started to say something about pricing for the enterprise tier. Want to add it?",
  quote: "I just want to say that the enterprise tier",
  at_ms: 754_000,
  end_ms: 757_000,
  decision_id: DECISION,
  decision_content: "Raise the team plan to 18 dollars a seat in January",
  status: "open",
  created_at: "2026-11-11T11:00:00Z",
};

export const CHECK_ROW: AgreementCheck = {
  id: CHECK,
  decision_id: DECISION,
  decision_content: "Raise the team plan to 18 dollars a seat in January",
  meeting_id: MEETING,
  meeting_title: "Pricing review",
  status: "asked",
  answer: null,
  note: null,
  share_name: false,
  answered_at: null,
  created_at: "2026-11-11T11:00:00Z",
};


const AFTER: AfterSignals = {
  meeting_id: MEETING,
  analyzed: true,
  my_nudge: NUDGE_ROW,
  late_contributions: [
    {
      id: "c1",
      meeting_id: MEETING,
      user_id: "u-priya",
      author_name: "Priya Nair",
      nudge_id: null,
      decision_id: DECISION,
      at_ms: 760_000,
      body: "If we raise the team plan, the 40 annual customers renewing in February should keep their price until renewal.",
      has_audio: false,
      audio_duration_ms: null,
      created_at: "2026-11-11T11:20:00Z",
      mine: false,
    },
    {
      id: "c2",
      meeting_id: MEETING,
      user_id: "u-sarah",
      author_name: "Sarah Okafor",
      nudge_id: null,
      decision_id: null,
      at_ms: 1_210_000,
      body: "The partner FAQ needs the new number before it goes out.",
      has_audio: true,
      audio_duration_ms: 47_000,
      created_at: "2026-11-11T11:40:00Z",
      mine: true,
    },
  ],
  decisions: [
    { decision_id: DECISION, agreement: "weak", late_contribution_count: 1, window_ends_at: "2026-11-12T10:00:00Z", in_window: true, you_own: false },
    { decision_id: "d2", agreement: "strong", late_contribution_count: 0, window_ends_at: "2026-11-12T10:00:00Z", in_window: true, you_own: false },
  ],
  resume_point: { ...RESUME, meeting_id: MEETING, meeting_title: "Pricing review", reason: "time_ran_out", headline: "Time ran out on the reseller discount", topic: "the reseller discount", cut_off: null },
};

const DECISIONS = [
  { id: DECISION, content: "Raise the team plan to 18 dollars a seat in January", status: "confirmed" },
  { id: "d2", content: "Keep the free tier, capped at 3 seats", status: "proposed" },
];

const OWNER: DecisionAgreement = {
  decision_id: DECISION,
  meeting_id: MEETING,
  strength: "weak",
  analyzed_at: NOW,
  you_own: true,
  summary: { participants: 5, support: 3, concerns: 1, object: 0, pending: 1, in_meeting: { yes: 2, hedged: 2, silent: 1, objected: 0, talked_over: 0 } },
  notes: [
    { text: "I support it if the February renewals keep their price.", author_name: "Priya Nair", answer: "concerns", at: NOW },
    { text: "Fine by me once finance signs off.", author_name: null, answer: "support", at: NOW },
  ],
  my_check: null,
};

const MEMBER: DecisionAgreement = {
  decision_id: DECISION,
  meeting_id: MEETING,
  strength: "weak",
  analyzed_at: NOW,
  you_own: false,
  summary: null,
  notes: [],
  my_check: CHECK_ROW,
};

export type RoomSignalsView =
  | "inbox"
  | "after"
  | "after-error"
  | "agreement-owner"
  | "agreement-member"
  | "agreement-pending"
  | "composer";

function Frame({ theme, wide = 1200, children }: { theme: "light" | "dark"; wide?: number; children: ReactNode }) {
  return (
    <OrgProvider
      value={{
        org: { id: "org-1", name: "Acme" },
        user: { id: "u-sarah", name: "Sarah Okafor", email: "sarah@example.com", role: "member" },
      }}
    >
      <div className="mx-app mx-meet min-h-dvh bg-bg p-4 text-ink sm:p-6" data-theme={theme}>
        <main className="mx-auto" style={{ maxWidth: wide }}>
          {children}
        </main>
        <Toaster />
      </div>
    </OrgProvider>
  );
}

function inboxItems() {
  const notes = [
    {
      ...describeNotification({
        id: "n-lw",
        meeting_id: MEETING,
        source: "notification",
        alert_type: null,
        priority: 3,
        title: NUDGE_ROW.prompt,
        body: "From Pricing review.",
        link: `/meetings/${MEETING}#last-word`,
        payload: { source_event_id: `lastword:${NUDGE}` },
        status: "unread",
        created_at: "2026-11-11T11:00:00Z",
      }),
      lastWord: NUDGE_ROW,
    },
    {
      ...describeNotification({
        id: "n-ag",
        meeting_id: MEETING,
        source: "notification",
        alert_type: null,
        priority: 2,
        title: `Where do you stand on "${CHECK_ROW.decision_content}"?`,
        body: "Answer privately. Your answer is anonymous unless you choose to add your name.",
        link: "/inbox",
        payload: { source_event_id: `agreement:${CHECK}` },
        status: "unread",
        created_at: "2026-11-11T11:01:00Z",
      }),
      agreementCheck: CHECK_ROW,
      href: `/meetings/${MEETING}/decisions/${DECISION}`,
    },
  ];
  return toInboxItems({ notifications: notes, updates: [], reviews: [] }, Date.parse(NOW));
}

export function RoomSignalsHarness({ view, theme = "light" }: { view: RoomSignalsView; theme?: "light" | "dark" }) {
  if (view === "inbox") {
    return (
      <Frame theme={theme}>
        <InboxView initial={inboxItems()} failed={[]} nowIso={NOW} />
      </Frame>
    );
  }
  if (view === "after" || view === "after-error") {
    return (
      <Frame theme={theme}>
        <AfterSignalsSection
          meetingId={MEETING}
          initial={view === "after" ? { ok: true, data: AFTER } : { ok: false, reason: "error" }}
          decisions={DECISIONS}
          nowIso={NOW}
        />
      </Frame>
    );
  }
  if (view === "composer") {
    return (
      <Frame theme={theme} wide={760}>
        <LateComposer meetingId={MEETING} nudgeId={NUDGE} onSent={() => undefined} autoFocus={false} />
      </Frame>
    );
  }
  const read =
    view === "agreement-owner"
      ? OWNER
      : view === "agreement-member"
        ? MEMBER
        : { ...MEMBER, strength: null, analyzed_at: null, my_check: null };
  return (
    <Frame theme={theme} wide={720}>
      <AgreementCard read={{ ok: true, data: read }} />
    </Frame>
  );
}
