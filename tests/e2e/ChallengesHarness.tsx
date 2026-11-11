import type { ReactNode } from "react";
import { OrgProvider } from "../../src/lib/org-context";
import { Toaster } from "../../src/components/ui/Toaster";
import { DecisionChallenges } from "../../src/components/decisions/DecisionChallenges";
import { ChallengesLocked, ChallengesSkeleton, ChallengesUnavailable } from "../../src/components/decisions/ChallengesStates";
import { InboxView } from "../../src/components/inbox/InboxView";
import { describeNotification } from "../../src/components/notifications/alert-copy";
import { toInboxItems } from "../../src/lib/inbox";
import type { DecisionChallenge, DecisionChallenges as Data, ReopenRequest } from "../../src/lib/api/decision-challenges-types";

/* "Decisions that follow you" as the app renders it: the decision page's "Challenged in N places"
   section (owner, someone else, the person who asked, empty, failed, locked, loading) and the
   Inbox rows for a challenge and a request to reopen. Fixed data, the house's sample people. */

export const NOW = "2026-11-11T12:00:00Z";
export const REQUEST_ID = "11111111-2222-4333-8444-555555555555";

const CHALLENGES: DecisionChallenge[] = [
  {
    id: "c-1",
    decision_id: "d-1",
    source: "slack",
    place_label: "#pricing",
    link: "https://acme.slack.com/archives/C1/p1731300000",
    quote: "Let's just give the team plan away free for the first year, it will drive adoption.",
    why: "The pricing review set the team plan at $18 a seat from day one.",
    relation: "contradicts",
    confidence: 0.88,
    status: "open",
    author: { id: "u-raj", name: "Raj Patel" },
    created_at: "2026-11-11T08:40:00Z",
    reopen_request_id: null,
  },
  {
    id: "c-2",
    decision_id: "d-1",
    source: "extension",
    place_label: "Google Docs",
    link: null,
    quote: "Q1 plan: launch the team plan at $12 a seat to undercut Linear.",
    why: "A different price than the one decided, without saying the decision changed.",
    relation: "contradicts",
    confidence: 0.81,
    status: "reopened",
    author: { id: "u-priya", name: "Priya Nair" },
    created_at: "2026-11-10T16:05:00Z",
    reopen_request_id: REQUEST_ID,
  },
  {
    id: "c-3",
    decision_id: "d-1",
    source: "mcp",
    place_label: "Claude",
    link: null,
    quote: "Should we revisit seat pricing for the team plan?",
    why: "Asks to reopen a question the pricing review settled.",
    relation: "reopens",
    confidence: 0.74,
    status: "open",
    author: { id: "u-diego", name: "Diego Alvarez" },
    created_at: "2026-11-09T11:20:00Z",
    reopen_request_id: null,
  },
  {
    id: "c-4",
    decision_id: "d-1",
    source: "slack",
    place_label: "#sales",
    link: null,
    quote: "Team plan pricing is up for grabs again?",
    why: "Asks whether the price is still open.",
    relation: "reopens",
    confidence: 0.71,
    status: "dismissed",
    author: { id: "u-aiko", name: "Aiko Tanaka" },
    created_at: "2026-11-08T10:00:00Z",
    reopen_request_id: null,
  },
];

const REQUEST: ReopenRequest = {
  id: REQUEST_ID,
  decision_id: "d-1",
  decision_content: "Price the team plan at $18 a seat",
  meeting_id: "m-1",
  meeting_title: "Pricing review",
  requested_by: { id: "u-priya", name: "Priya Nair" },
  owner: { id: "u-maya", name: "Maya Chen" },
  reason: "Linear dropped their team tier to $10 last week. At $18 we lose the comparison on every sales call.",
  quote: "Q1 plan: launch the team plan at $12 a seat to undercut Linear.",
  source: "extension",
  place_label: "Google Docs",
  link: null,
  status: "pending",
  outcome: null,
  follow_up_action_id: null,
  revisit_meeting_id: null,
  response_note: null,
  created_at: "2026-11-10T16:06:00Z",
  resolved_at: null,
  viewer_role: "owner",
};

const OWNER: Data = {
  decision_id: "d-1",
  owner: { id: "u-maya", name: "Maya Chen" },
  viewer_is_owner: true,
  open_count: 2,
  places: 3,
  items: CHALLENGES,
  reopen_requests: [REQUEST],
};

export type ChallengesView = "owner" | "viewer" | "requester" | "empty" | "unavailable" | "locked" | "loading" | "inbox";

function Frame({ theme, children }: { theme: "light" | "dark"; children: ReactNode }) {
  return (
    <OrgProvider value={{ org: { id: "org-1", name: "Acme" }, user: { id: "u-maya", name: "Maya Chen", email: "maya@example.com", role: "member" } }}>
      <div className="mx-app mx-meet min-h-dvh bg-bg p-4 text-ink sm:p-6" data-theme={theme}>
        <main className="mx-auto max-w-[1100px]">{children}</main>
        <Toaster />
      </div>
    </OrgProvider>
  );
}

function inboxItems() {
  const rows = [
    describeNotification({
      id: "n-1",
      meeting_id: null,
      source: "notification",
      alert_type: null,
      priority: 2,
      title: "Your decision was challenged in #pricing",
      body: "The pricing review set the team plan at $18 a seat from day one.",
      link: "/meetings/m-1/decisions/d-1#challenges",
      payload: { source_event_id: "decision-challenge:6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b", quote: CHALLENGES[0].quote, place_label: "#pricing" },
      status: "unread",
      created_at: "2026-11-11T08:41:00Z",
    }),
    {
      ...describeNotification({
        id: "n-2",
        meeting_id: null,
        source: "notification",
        alert_type: null,
        priority: 2,
        title: "Priya Nair asked to reopen your decision",
        body: '"Price the team plan at $18 a seat". Linear dropped their team tier to $10 last week.',
        link: `/meetings/m-1/decisions/d-1?reopen=${REQUEST_ID}#challenges`,
        payload: { source_event_id: `decision-reopen:${REQUEST_ID}` },
        status: "unread",
        created_at: "2026-11-10T16:06:00Z",
      }),
      reopen: REQUEST,
    },
  ];
  return toInboxItems({ notifications: rows }, Date.parse(NOW));
}

export function ChallengesHarness({ view, theme = "light", focus = false }: { view: ChallengesView; theme?: "light" | "dark"; focus?: boolean }) {
  const common = { decisionId: "d-1", meetingId: "m-1", superseded: false, nowIso: NOW };
  return (
    <Frame theme={theme}>
      {view === "owner" ? (
        <DecisionChallenges {...common} data={OWNER} focusReopenId={focus ? REQUEST_ID : null} />
      ) : view === "viewer" ? (
        <DecisionChallenges
          {...common}
          data={{ ...OWNER, viewer_is_owner: false, items: CHALLENGES.slice(0, 2), reopen_requests: [{ ...REQUEST, viewer_role: "viewer" }] }}
        />
      ) : view === "requester" ? (
        <DecisionChallenges {...common} data={{ ...OWNER, viewer_is_owner: false, items: [], reopen_requests: [{ ...REQUEST, viewer_role: "requester" }] }} />
      ) : view === "empty" ? (
        <DecisionChallenges {...common} data={{ ...OWNER, viewer_is_owner: false, open_count: 0, places: 0, items: [], reopen_requests: [] }} />
      ) : view === "unavailable" ? (
        <ChallengesUnavailable />
      ) : view === "locked" ? (
        <ChallengesLocked />
      ) : view === "loading" ? (
        <ChallengesSkeleton />
      ) : (
        <InboxView initial={inboxItems()} failed={[]} nowIso={NOW} />
      )}
    </Frame>
  );
}
