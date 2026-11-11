import type { ReactNode } from "react";
import "../../src/styles/meeting-minutes.css";
import { OrgProvider } from "../../src/lib/org-context";
import { Toaster } from "../../src/components/ui/Toaster";
import { DecisionWhySection } from "../../src/components/decision-why/DecisionWhySection";
import { BlastRadiusSection } from "../../src/components/blast-radius/BlastRadiusSection";
import { BlastChip } from "../../src/components/blast-radius/BlastChip";
import { SettleThread } from "../../src/components/settle/SettleThread";
import { SettleList } from "../../src/components/settle/SettleList";
import { ReversalBanner } from "../../src/components/reversals/ReversalBanner";
import { Chip } from "../../src/components/meetings/Chip";
import type { DecisionReversal } from "../../src/lib/api/only-mytheus-types";
import type { BlastRadius, DecisionWhy, Load, Settlement } from "../../src/lib/api/why-blast-types";
import {
  A_PRICE,
  BLAST,
  BLAST_EMPTY,
  BLAST_MANY,
  BLAST_PENDING,
  DECISION,
  DECISION_2,
  MEETING,
  SETTLEMENT,
  SETTLEMENT_PROPOSAL,
  SETTLEMENT_RESOLVED,
  SETTLEMENT_SHARED,
  WHY,
  WHY_EMPTY,
  WHY_PENDING,
  WHY_QUIET,
  WHY_READONLY,
  WHY_REDACTED,
  WHY_REOPENED,
} from "./why-blast-fixture";

/* The a4 components as the app renders them: the org context, the `.mx-app` theme root (light or
   dark) and the toast surface, with fixed data in the contract's shapes. `width` sets the main
   column's width, as the decision page's main column would be beside its side column. */

export type WhyBlastView =
  | "why"
  | "why-quiet"
  | "why-pending"
  | "why-empty"
  | "why-readonly"
  | "why-redacted"
  | "why-reopened"
  | "why-error"
  | "why-none"
  | "blast"
  | "blast-many"
  | "blast-pending"
  | "blast-empty"
  | "blast-error"
  | "chips"
  | "settle-open"
  | "settle-proposal"
  | "settle-resolved"
  | "settle-list"
  | "settle-empty"
  | "reversal-reopened";

const ok = <T,>(data: T): Load<T> => ({ ok: true, data });

const WHY_VIEWS: Partial<Record<WhyBlastView, Load<DecisionWhy>>> = {
  why: ok(WHY),
  "why-quiet": ok(WHY_QUIET),
  "why-pending": ok(WHY_PENDING),
  "why-empty": ok(WHY_EMPTY),
  "why-readonly": ok(WHY_READONLY),
  "why-redacted": ok(WHY_REDACTED),
  "why-reopened": ok(WHY_REOPENED),
  "why-error": { ok: false, reason: "error" },
  "why-none": { ok: false, reason: "none" },
};

const BLAST_VIEWS: Partial<Record<WhyBlastView, Load<BlastRadius>>> = {
  blast: ok(BLAST),
  "blast-many": ok(BLAST_MANY),
  "blast-pending": ok(BLAST_PENDING),
  "blast-empty": ok(BLAST_EMPTY),
  "blast-error": { ok: false, reason: "error" },
};

const SETTLE_VIEWS: Partial<Record<WhyBlastView, Settlement>> = {
  "settle-open": SETTLEMENT,
  "settle-proposal": SETTLEMENT_PROPOSAL,
  "settle-resolved": SETTLEMENT_RESOLVED,
};

const REOPENED: DecisionReversal & { kind: "reopened" } = {
  id: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b",
  kind: "reopened",
  status: "pending",
  created_at: "2026-11-11T09:00:00Z",
  resolved_at: null,
  old_decision: { id: DECISION, content: "Go with Acme as our SSO vendor", meeting_id: MEETING, meeting_title: "Security review", decided_at: "2026-11-03T10:00:00Z" },
  new_decision: { id: DECISION, content: "Go with Acme as our SSO vendor", meeting_id: MEETING, meeting_title: "Security review", decided_at: "2026-11-03T10:00:00Z" },
  action: { id: "a-1", content: "Draft the Acme migration plan", due_date: "2026-11-20", status: "confirmed", meeting_id: MEETING, meeting_title: "Security review" },
};

function Frame({ theme, width, children }: { theme: "light" | "dark"; width: number; children: ReactNode }) {
  return (
    <OrgProvider
      value={{
        org: { id: "org-1", name: "Acme" },
        user: { id: "u-sarah", name: "Sarah Okafor", email: "sarah@example.com", role: "member" },
      }}
    >
      <div className="mx-app mx-meet min-h-dvh bg-bg px-4 py-6 text-ink sm:px-6" data-theme={theme}>
        <main className="mx-auto" style={{ maxWidth: width }}>
          {children}
        </main>
        <Toaster />
      </div>
    </OrgProvider>
  );
}

export function WhyBlastHarness({
  view,
  theme = "light",
  width = 880,
  focus = null,
}: {
  view: WhyBlastView;
  theme?: "light" | "dark";
  width?: number;
  focus?: string | null;
}) {
  const why = WHY_VIEWS[view];
  const blast = BLAST_VIEWS[view];
  const settle = SETTLE_VIEWS[view];
  return (
    <Frame theme={theme} width={width}>
      <h1 className="sr-only">Decision</h1>
      {why ? (
        <DecisionWhySection decisionId={DECISION} initial={why} focusAssumptionId={focus === "price" ? A_PRICE : focus} />
      ) : blast ? (
        <BlastRadiusSection decisionId={DECISION} initial={blast} />
      ) : settle ? (
        <SettleThread initial={view === "settle-open" ? SETTLEMENT : settle} />
      ) : view === "settle-list" ? (
        <SettleList items={[SETTLEMENT, SETTLEMENT_SHARED, SETTLEMENT_RESOLVED].map((s, i) => ({ ...s, id: `${s.id.slice(0, -1)}${i}` }))} />
      ) : view === "settle-empty" ? (
        <SettleList items={[]} />
      ) : view === "reversal-reopened" ? (
        <ReversalBanner items={[REOPENED]} focusId={null} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {/* The room's Notes mode decision list, with its real classes. */}
          <section className="nv-card" aria-labelledby="chips-room-h">
            <h2 id="chips-room-h" className="text-[15px] font-semibold text-ink">
              In the room
            </h2>
            <ul className="nv-decided">
              <li>
                <p>Go with Acme as our SSO vendor</p>
                <small>Confirmed by Sarah Okafor</small>
                <BlastChip decisionId={DECISION} meetingId={MEETING} />
              </li>
              <li>
                <p>Ship the beta to 10 design partners first</p>
                <small>Confirmed by Raj Patel</small>
                <BlastChip decisionId={DECISION_2} meetingId={MEETING} />
              </li>
            </ul>
          </section>
          {/* The after page's minutes, with its real classes. */}
          <section className="mn-panel" aria-labelledby="chips-after-h">
            <h2 id="chips-after-h" className="text-[15px] font-semibold text-ink">
              After the meeting
            </h2>
            <ul>
              <li className="mn-row">
                <span className="mn-row-text">
                  Go with Acme as our SSO vendor
                  <BlastChip decisionId={DECISION} meetingId={MEETING} />
                </span>
                <Chip tone="ok">Agreed</Chip>
              </li>
              <li className="mn-row">
                <span className="mn-row-text">
                  Ship the beta to 10 design partners first
                  <BlastChip decisionId={DECISION_2} meetingId={MEETING} />
                </span>
                <Chip tone="ok">Agreed</Chip>
              </li>
            </ul>
          </section>
        </div>
      )}
    </Frame>
  );
}
