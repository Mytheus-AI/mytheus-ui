import type { ReactNode } from "react";
import { OrgProvider } from "../../src/lib/org-context";
import { Toaster } from "../../src/components/ui/Toaster";
import { ReversalActions } from "../../src/components/reversals/ReversalActions";
import { ReversalBanner } from "../../src/components/reversals/ReversalBanner";
import { PreApprovedAnswersEditor } from "../../src/components/meetings/PreApprovedAnswersEditor";
import { MeetingPrecheckHint } from "../../src/components/meetings/MeetingPrecheckHint";
import { WeeklyDigestForm } from "../../src/components/settings/WeeklyDigestForm";
import { DigestSections } from "../../src/components/digest/DigestSections";
import type { DecisionReversal, WeeklyDigest } from "../../src/lib/api/only-mytheus-types";

/* The only-Mytheus components as the app shell renders them: the org context, the `.mx-app` theme
   root (light or dark) and the toast surface. Fixed data with the house's sample people. */

export const REVERSAL: DecisionReversal = {
  id: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b",
  status: "pending",
  created_at: "2026-11-10T09:00:00Z",
  resolved_at: null,
  old_decision: { id: "d-old", content: "Ship the beta to 40 customers", meeting_id: "m-1", meeting_title: "Beta review", decided_at: "2026-10-03T10:00:00Z" },
  new_decision: { id: "d-new", content: "Ship the beta to 10 design partners", meeting_id: "m-2", meeting_title: "Launch sync", decided_at: "2026-11-10T10:00:00Z" },
  action: { id: "a-1", content: "Email the 40 beta customers", due_date: "2026-11-20", status: "confirmed", meeting_id: "m-1", meeting_title: "Beta review" },
};

const DIGEST: WeeklyDigest = {
  id: "7f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b",
  week_start: "2026-11-02",
  week_end: "2026-11-08",
  created_at: "2026-11-09T07:00:00Z",
  topics: ["pricing", "beta"],
  item_count: 5,
  decisions: [{ id: "d1", content: "Price the team plan at $18 a seat", meeting_id: "m1", meeting_title: "Pricing review", decided_at: "2026-11-03T10:00:00Z", matched_topics: ["pricing"] }],
  decision_changes: [
    { old_decision_id: "d-old", old_content: "Ship the beta to 40 customers", new_decision_id: "d-new", new_content: "Ship the beta to 10 design partners", meeting_id: "m2", meeting_title: "Launch sync", changed_at: "2026-11-05T10:00:00Z", matched_topics: ["beta"] },
  ],
  actions_assigned: [{ id: "a1", content: "Draft the partner FAQ", meeting_id: "m2", meeting_title: "Launch sync", due_date: "2026-11-14", status: "confirmed", changed_at: null }],
  actions_closed: [],
  promises_due: [{ kind: "commitment", id: "c1", content: "Send Raj the pricing deck", due_date: null, due_hint: "by Friday", meeting_id: "m1", meeting_title: "Pricing review" }],
};

export type HarnessView = "reversal" | "banner" | "answers" | "answers-readonly" | "precheck" | "digest-prefs" | "digest-prefs-no-email" | "digest";

function Frame({ theme, children }: { theme: "light" | "dark"; children: ReactNode }) {
  return (
    <OrgProvider
      value={{
        org: { id: "org-1", name: "Acme" },
        user: { id: "u-sarah", name: "Sarah Okafor", email: "sarah@example.com", role: "member" },
      }}
    >
      <div className="mx-app mx-meet min-h-dvh bg-bg p-6 text-ink" data-theme={theme}>
        <main className="mx-auto max-w-[1100px]">{children}</main>
        <Toaster />
      </div>
    </OrgProvider>
  );
}

export function OnlyHarness({ view, theme = "light" }: { view: HarnessView; theme?: "light" | "dark" }) {
  return (
    <Frame theme={theme}>
      {view === "reversal" ? (
        <section aria-label="Reversal" className="rounded-card border border-line bg-surface p-5">
          <h1 className="text-[15px] font-semibold text-ink">{REVERSAL.action.content}</h1>
          <ReversalActions reversalId={REVERSAL.id} status="pending" task={{ content: REVERSAL.action.content, due_date: REVERSAL.action.due_date }} label={REVERSAL.action.content} />
        </section>
      ) : view === "banner" ? (
        <ReversalBanner items={[REVERSAL, { ...REVERSAL, id: "8f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b", status: "kept" }]} focusId={REVERSAL.id} />
      ) : view === "answers" || view === "answers-readonly" ? (
        <section aria-label="Pre-approved answers" className="max-w-[640px] rounded-card border border-line bg-surface p-5">
          <PreApprovedAnswersEditor
            meetingId="5f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b"
            initial={["We ship the beta on Dec 2. QA has signed off.", "The budget for partners is approved."]}
            editable={view === "answers"}
            limits={{ statementsMax: 10, charsMax: 300 }}
            personName="Sarah Okafor"
          />
        </section>
      ) : view === "precheck" ? (
        <section aria-label="New meeting" className="max-w-[560px] rounded-card border border-line bg-surface p-5">
          <MeetingPrecheckHint title="Beta launch review" agenda={["QA status from Raj", "Docs status from Priya"]} participantIds={[]} />
        </section>
      ) : view === "digest-prefs" || view === "digest-prefs-no-email" ? (
        <WeeklyDigestForm initial={{ weekly_enabled: true, email_enabled: false }} loaded emailConfigured={view === "digest-prefs"} />
      ) : (
        <DigestSections digest={DIGEST} />
      )}
    </Frame>
  );
}
