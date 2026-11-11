import type { ReactNode } from "react";
import { OrgProvider } from "../../src/lib/org-context";
import { Toaster } from "../../src/components/ui/Toaster";
import { DecisionBet } from "../../src/components/bets/DecisionBet";
import { CallsReport } from "../../src/components/bets/CallsReport";
import { TimeMachine } from "../../src/components/time-machine/TimeMachine";
import { BET, CALIBRATION, DECISION_ID, DIFF, DUE, EMPTY_CALIBRATION, MEETING_ID, MINE, PROPOSED, RESOLVED, SNAPSHOT, TIMELINE, TODAY, view } from "./bets-fixture";

/* Decisions as bets and the time machine as the app shell renders them: the org context, the
   `.mx-app` theme root (light or dark) and the toast surface, with the server actions answered
   by the stubs (see playwright-ct.config.ts). */

export type BetsView =
  | "bet-empty"
  | "bet-empty-readonly"
  | "bet-proposed"
  | "bet-open"
  | "bet-due"
  | "bet-resolved"
  | "calls"
  | "calls-empty"
  | "tm-snapshot"
  | "tm-compare"
  | "tm-topic"
  | "tm-topic-empty";

function Frame({ theme, children }: { theme: "light" | "dark"; children: ReactNode }) {
  return (
    <OrgProvider value={{ org: { id: "org-1", name: "Acme" }, user: { id: "u-maya", name: "Maya Patel", email: "maya@example.com", role: "member" } }}>
      <div className="mx-app min-h-dvh bg-bg p-4 text-ink sm:p-6" data-theme={theme}>
        <main className="mx-auto max-w-[1320px]">{children}</main>
        <Toaster />
      </div>
    </OrgProvider>
  );
}

export function BetsHarness({ view: v, theme = "light" }: { view: BetsView; theme?: "light" | "dark" }) {
  const bet = (b: typeof BET | null, canEdit = true) => (
    <DecisionBet initial={view(b, canEdit)} decisionId={DECISION_ID} meetingId={MEETING_ID} decisionContent="Move every plan to annual billing from January" today={TODAY} />
  );
  const tm = (mode: "as-of" | "compare" | "topic", topic = "") => (
    <TimeMachine
      initial={{ mode, asOf: "2026-07-31", from: "2026-06-01", to: "2026-10-31", topic }}
      initialData={
        mode === "as-of"
          ? { mode, result: { ok: true, data: SNAPSHOT } }
          : mode === "compare"
            ? { mode, result: { ok: true, data: DIFF } }
            : { mode, result: topic ? { ok: true, data: TIMELINE } : null }
      }
      today={TODAY}
      earliest="2026-06-10"
    />
  );
  return (
    <Frame theme={theme}>
      {v === "bet-empty"
        ? bet(null)
        : v === "bet-empty-readonly"
          ? bet(null, false)
          : v === "bet-proposed"
            ? bet(PROPOSED)
            : v === "bet-open"
              ? bet(BET)
              : v === "bet-due"
                ? bet(DUE)
                : v === "bet-resolved"
                  ? bet(RESOLVED)
                  : v === "calls"
                    ? <CallsReport cal={CALIBRATION} mine={MINE} today={TODAY} />
                    : v === "calls-empty"
                      ? <CallsReport cal={EMPTY_CALIBRATION} mine={[]} today={TODAY} />
                      : v === "tm-snapshot"
                        ? tm("as-of")
                        : v === "tm-compare"
                          ? tm("compare")
                          : v === "tm-topic"
                            ? tm("topic", "pricing")
                            : tm("topic")}
    </Frame>
  );
}
