import type { ReactNode } from "react";
import { OrgProvider } from "../../src/lib/org-context";
import { Toaster } from "../../src/components/ui/Toaster";
import { Card, CardBody, CardHead } from "../../src/components/ui/Card";
import { ListeningWeekView } from "../../src/components/listening/ListeningWeek";
import { RulesPanel } from "../../src/components/listening/RulesPanel";
import { InterruptionList } from "../../src/components/listening/InterruptionList";
import { EveningDigestBody } from "../../src/components/listening/EveningDigestView";
import { ListeningSettings } from "../../src/components/listening/ListeningSettings";
import { PositionsEditor } from "../../src/components/listening/PositionsEditor";
import { InterruptionToast, LiveInterruptions } from "../../src/components/listening/LiveInterruptions";
import { InboxInterruption } from "../../src/components/listening/InboxInterruption";
import { MeetingChoiceCard } from "../../src/components/listening/MeetingChoiceCard";
import { INTERRUPTION, M } from "./listening-fixture";
import type {
  AttendanceRule,
  EveningDigest,
  Interruption,
  ListeningPreferencesView,
  ListeningWeek,
  StandingPosition,
  WeekMeeting,
} from "../../src/lib/api/listening-types";

/* In every meeting at once, as the app shell renders it: the org context, the `.mx-app` theme
   root (light or dark), the toast surface. Fixed data with the house's sample people; the server
   actions are answered at the edge (stubs/actions.ts). */

let k = 0;
const wm = (day: number, hour: number, title: string, over: Partial<WeekMeeting> = {}): WeekMeeting => ({
  meeting_id: M(++k),
  title,
  status: "scheduled",
  scheduled_start: new Date(Date.UTC(2026, 10, 9 + day, hour, 0)).toISOString(),
  scheduled_end: new Date(Date.UTC(2026, 10, 9 + day, hour, 45)).toISOString(),
  duration_minutes: 45,
  confidential: false,
  recurring: false,
  hosting: false,
  choice: "attend",
  source: "default",
  rule_id: null,
  can_agent_listen: true,
  ...over,
});

const RULE: AttendanceRule = {
  id: "c1c2c3d4-0000-4000-8000-000000000001",
  choice: "agent_listens",
  title_contains: "status",
  template_id: null,
  template_name: null,
  recurring_only: true,
  include_hosted: false,
  position: 0,
  created_at: "2026-11-01T09:00:00Z",
  updated_at: "2026-11-01T09:00:00Z",
};

const MEETINGS: WeekMeeting[] = [
  wm(0, 9, "Weekly status", { recurring: true, choice: "agent_listens", source: "rule", rule_id: RULE.id }),
  wm(0, 14, "Design crit", { choice: "skip", source: "manual" }),
  wm(1, 10, "Pricing review"),
  wm(1, 15, "Board prep", { confidential: true, can_agent_listen: false, hosting: true }),
  wm(2, 9, "Weekly status", { recurring: true, choice: "agent_listens", source: "rule", rule_id: RULE.id }),
  wm(2, 11, "1:1 with Raj"),
  wm(3, 16, "Launch sync", { choice: "agent_listens", source: "manual" }),
  wm(4, 9, "Weekly status", { recurring: true, choice: "agent_listens", source: "rule", rule_id: RULE.id }),
];

const WEEK: ListeningWeek = {
  week_start: "2026-11-09",
  week_end: "2026-11-15",
  time_zone: "Europe/London",
  summary: { invited: 8, attend: 3, agent_listens: 4, skip: 1, minutes_saved: 225, hours_saved: 3.8 },
  meetings: MEETINGS,
  rules: [RULE],
};

const DIGEST: EveningDigest = {
  id: "d1d2d3d4-0000-4000-8000-000000000001",
  day: "2026-11-11",
  status: "ready",
  meeting_count: 3,
  minutes_saved: 135,
  created_at: "2026-11-11T18:05:00Z",
  paragraph: [
    { text: "Your Myte sat in on 2 meetings for you today. In " },
    { text: "Pricing review (3pm)", href: `/meetings/${M(3)}` },
    { text: ", the team agreed the SMB floor and asked for your margin model. Decided: " },
    { text: "SMB tier discount floor is 15%", href: `/meetings/${M(3)}/transcript#t=125` },
    { text: ". It pulled you in once, about pricing. In " },
    { text: "Weekly status (9am)", href: `/meetings/${M(5)}` },
    { text: ", QA signed off on the beta. You also skipped Design crit; nobody listened for you there, and the shared minutes are on each meeting's page." },
  ],
  meetings: [],
};


const RAISED: Interruption[] = [
  INTERRUPTION,
  {
    ...INTERRUPTION,
    id: "e1e2e3d4-0000-4000-8000-000000000002",
    reason: "question",
    title: "Raj is asking for your view on the launch date in the 11am right now.",
    quote: "Sushan would know if the docs can be ready by the 2nd.",
    status: "held",
    held_reason: "focus_block",
    meeting_status: "ended",
    meeting_title: "Launch sync",
    can_respond: false,
  },
  {
    ...INTERRUPTION,
    id: "e1e2e3d4-0000-4000-8000-000000000003",
    reason: "promise",
    title: "Someone is promising your team will take the migration in the 9am right now.",
    quote: null,
    meeting_title: "Weekly status",
    meeting_status: "ended",
    response: "view_sent",
    can_respond: false,
  },
];

const PREFS: ListeningPreferencesView = {
  interruptions_enabled: true,
  max_per_hour: 3,
  quiet_start: "21:00",
  quiet_end: "08:00",
  focus_blocks: [{ days: [0, 1, 2, 3, 4], start: "09:00", end: "11:00", label: "Deep work" }],
  never_during_focus: true,
  digest_enabled: true,
  digest_hour: 18,
  time_zone: "Europe/London",
  interruptible_now: false,
  quiet_reason: "focus_block",
  quiet_until: "2026-11-11T11:00:00Z",
};

const POSITIONS: StandingPosition[] = [
  { id: "a1", topic: "Pricing", text: "No discount above 10% for SMB without finance.", created_at: "", updated_at: "" },
  { id: "a2", topic: "Hiring", text: "No new contractors this quarter.", created_at: "", updated_at: "" },
];

export type ListeningView =
  | "week"
  | "week-empty"
  | "rules"
  | "rules-empty"
  | "digest"
  | "raised"
  | "raised-empty"
  | "settings"
  | "toast"
  | "inbox-row"
  | "choice-card"
  | "live";

function Frame({ theme, wide = false, children }: { theme: "light" | "dark"; wide?: boolean; children: ReactNode }) {
  return (
    <OrgProvider
      value={{
        org: { id: "org-1", name: "Acme" },
        user: { id: "u-sushan", name: "Sushan Shetty", email: "sushan@example.com", role: "member" },
      }}
    >
      <div className="mx-app mx-meet min-h-dvh bg-bg p-4 text-ink sm:p-6" data-theme={theme}>
        <main className={`mx-auto ${wide ? "max-w-[1320px]" : "max-w-[1100px]"}`}>{children}</main>
        <Toaster />
      </div>
    </OrgProvider>
  );
}

export function ListeningHarness({ view, theme = "light" }: { view: ListeningView; theme?: "light" | "dark" }) {
  return (
    <Frame theme={theme} wide={view === "week"}>
      {view === "week" ? <ListeningWeekView week={WEEK} today="2026-11-11" /> : null}
      {view === "week-empty" ? <ListeningWeekView week={{ ...WEEK, meetings: [], summary: { ...WEEK.summary, invited: 0, attend: 0, agent_listens: 0, skip: 0, minutes_saved: 0, hours_saved: 0 } }} today="2026-11-11" /> : null}
      {view === "rules" ? <RulesPanel rules={[RULE]} templates={[{ id: "t-1", name: "Status update" }]} /> : null}
      {view === "rules-empty" ? <RulesPanel rules={[]} templates={null} /> : null}
      {view === "digest" ? (
        <Card as="section" flush aria-labelledby="digest-h">
          <CardHead id="digest-h" title="Evening digest" caption="What your Myte heard while you were elsewhere" divided />
          <CardBody className="pt-4">
            <EveningDigestBody digest={DIGEST} />
          </CardBody>
        </Card>
      ) : null}
      {view === "raised" ? <InterruptionList items={RAISED} nowIso="2026-11-11T16:00:00Z" /> : null}
      {view === "raised-empty" ? <InterruptionList items={[]} nowIso="2026-11-11T16:00:00Z" /> : null}
      {view === "settings" ? (
        <div className="grid gap-5">
          <ListeningSettings initial={PREFS} loaded />
          <PositionsEditor initial={POSITIONS} loaded />
        </div>
      ) : null}
      {view === "toast" ? (
        <div className="ml-auto w-full max-w-[420px] rounded-card border border-line bg-surface px-4 py-3 shadow-warm-3">
          <InterruptionToast interruption={INTERRUPTION} onJoin={() => undefined} onView={() => undefined} onHold={() => undefined} onDismiss={() => undefined} />
        </div>
      ) : null}
      {view === "inbox-row" ? (
        <Card flush>
          <div className="px-4 py-4 sm:px-[22px]">
            <p className="text-[12.5px] font-semibold text-ink-3">Your Myte, from a live meeting</p>
            <h3 className="mt-0.5 text-[15px] font-semibold text-ink">{INTERRUPTION.title}</h3>
            <InboxInterruption interruption={INTERRUPTION} />
          </div>
        </Card>
      ) : null}
      {view === "choice-card" ? (
        <div className="max-w-[460px]">
          <MeetingChoiceCard
            meetingId={M(3)}
            title="Pricing review"
            initial={{ meeting_id: M(3), choice: "agent_listens", source: "rule", rule_id: RULE.id, attendance: "agent", agents_listening: 2 }}
            confidential={false}
            editable
          />
        </div>
      ) : null}
      {view === "live" ? (
        <>
          <p className="text-[15px] text-ink-2">Somewhere else in the app.</p>
          <LiveInterruptions />
        </>
      ) : null}
    </Frame>
  );
}
