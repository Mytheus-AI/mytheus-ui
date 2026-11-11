import type { ReactNode } from "react";
import "../../../src/styles/meeting-hub.css";
import "../../../src/styles/meeting-brain.css";
import { ArrowLeft, CalendarBlank, Clock, Sparkle, UserCircle, UserPlus, VideoCamera } from "@phosphor-icons/react";
import { LinkButton } from "../../../src/components/ui/Button";
import { Chip } from "../../../src/components/ui/Chip";
import { Card, CardBody, CardHead } from "../../../src/components/ui/Card";
import "../../../src/styles/meeting-transcript.css";
import TranscriptLoading from "../../../src/app/(app)/meetings/[meetingId]/transcript/loading";
import { TranscriptView } from "../../../src/components/meeting/TranscriptView";
import { TalkTimePanel } from "../../../src/components/transcript/TalkTimePanel";
import type { TranscriptChunk } from "../../../src/lib/api/transcript";
import ListeningLoading from "../../../src/app/(app)/meetings/listening/loading";
import { ListeningWeekView } from "../../../src/components/listening/ListeningWeek";
import { RulesPanel } from "../../../src/components/listening/RulesPanel";
import { InterruptionList } from "../../../src/components/listening/InterruptionList";
import { EveningDigestBody } from "../../../src/components/listening/EveningDigestView";
import { M, INTERRUPTION } from "../listening-fixture";
import type { AttendanceRule, EveningDigest, Interruption, ListeningWeek, WeekMeeting } from "../../../src/lib/api/listening-types";
import { GearSix } from "@phosphor-icons/react";
import DecisionsLoading from "../../../src/app/(app)/decisions/loading";
import { DecisionsLog } from "../../../src/components/decisions/DecisionsLog";
import type { DecisionView } from "../../../src/lib/api/decisions";
import CallsLoading from "../../../src/app/(app)/decisions/calls/loading";
import TimeMachineLoading from "../../../src/app/(app)/decisions/time-machine/loading";
import { CallsReport } from "../../../src/components/bets/CallsReport";
import { TimeMachine } from "../../../src/components/time-machine/TimeMachine";
import { CALIBRATION, MINE, SNAPSHOT, TODAY } from "../bets-fixture";
import { ClockCounterClockwise, Target } from "@phosphor-icons/react";
import DecisionLoading from "../../../src/app/(app)/meetings/[meetingId]/decisions/[decisionId]/loading";
import CollaborationsLoading from "../../../src/app/(app)/meetings/[meetingId]/collaborations/loading";
import RecordLoading from "../../../src/app/(app)/meetings/[meetingId]/record/loading";
import { PageColumns, PageGrid } from "../../../src/components/ui/Page";
import { SectionCard } from "../../../src/components/ui/Card";
import { Note } from "../../../src/components/ui/Note";
import { StatCard } from "../../../src/components/admin/StatCard";
import { CheckCircle, ShieldCheck } from "@phosphor-icons/react";
import CatchUpLoading from "../../../src/app/(app)/meetings/[meetingId]/catch-up/loading";
import MeetingLoading from "../../../src/app/(app)/meetings/[meetingId]/loading";
import { Shell, type Theme } from "./Shell";
import { Page, PageHead } from "../../../src/components/ui/Page";
import { SectionTabs } from "../../../src/components/app/SectionTabs";
import MeetingsLoading from "../../../src/app/(app)/meetings/loading";
import { MeetingsHub, type HubPerson } from "../../../src/components/meetings/MeetingsHub";
import { NewMeeting } from "../../../src/components/meetings/NewMeeting";
import type { CallMeeting } from "../../../src/lib/api/meetings";

/* Skeleton and page pairs, Meetings and Decisions group. Each entry renders a route's loading.tsx
   (`skeleton`) or the page as it looks loaded (`page`): the page's real view component with sample
   data where the page hands plain data to one, otherwise a faithful copy of the server page's
   frame (its classes and cards) with sample content. */

const PEOPLE: Record<string, HubPerson> = {
  "u-maya": { name: "Maya Chen", imageUrl: null, isYou: true },
  "u-raj": { name: "Raj Patel", imageUrl: null, isYou: false },
  "u-priya": { name: "Priya Nair", imageUrl: null, isYou: false },
  "u-diego": { name: "Diego Alvarez", imageUrl: null, isYou: false },
};

const later = (h: number) => {
  const d = new Date();
  d.setHours(Math.min(23, d.getHours() + h), 0, 0, 0);
  return d.toISOString();
};

const meeting = (id: string, title: string, startTime: string, over: Partial<CallMeeting> = {}): CallMeeting => ({
  id,
  title,
  startTime,
  durationMinutes: 30,
  status: "upcoming",
  invited: 4,
  participantIds: Object.keys(PEOPLE),
  participants: Object.keys(PEOPLE).map((p, i) => ({ id: p, role: i === 0 ? "host" : null, attendance: "live", proxyUpdate: null, proxyQuestions: [] })),
  confidential: false,
  templateId: null,
  missed: false,
  hostUserId: "u-maya",
  createdBy: "u-maya",
  previousMeetingId: null,
  previousMeeting: null,
  agenda: [],
  ...over,
});

const MEETINGS: CallMeeting[] = [
  meeting("m-1", "Weekly sync", later(1)),
  meeting("m-2", "Pricing review with Raj", later(2)),
  meeting("m-3", "Onboarding notes", later(3)),
  meeting("m-4", "Q4 launch review", later(4)),
];

/* The meeting page (an async server component) as it renders a scheduled meeting: a copy of its
   frame from page.tsx (head, `.md-cols`, the When, agenda, agent and people cards). */
function MeetingDetailStub() {
  const card = (title: string, children: ReactNode, note?: string) => (
    <section className="mx-card mx-card-pad">
      <div className="mx-card-head">
        <h2 className="mx-card-title">{title}</h2>
        {note ? <span className="mx-card-note">{note}</span> : null}
      </div>
      {children}
    </section>
  );
  const rows = (items: [string, string][]) => (
    <div className="flex flex-col">
      {items.map(([a, b]) => (
        <div key={a} className="border-line py-2.5 [&+&]:border-t">
          <p className="text-[15px] font-semibold text-ink">{a}</p>
          <p className="text-[14px] text-ink-3">{b}</p>
        </div>
      ))}
    </div>
  );
  return (
    <div className="mx-page md">
      <a href="/meetings" className="mx-back">
        <ArrowLeft size={16} weight="bold" aria-hidden="true" />
        All meetings
      </a>
      <header className="mx-head">
        <div className="mx-head-main">
          <div className="md-chips">
            <Chip tone="low">Scheduled</Chip>
            <Chip>
              <UserCircle size={14} aria-hidden="true" />
              You host
            </Chip>
          </div>
          <h1 className="mx-title">Weekly sync</h1>
          <div className="md-meta">
            <span>
              <CalendarBlank size={18} aria-hidden="true" />
              Wednesday, November 11
            </span>
            <span>
              <Clock size={18} aria-hidden="true" />
              4:00 PM to 4:30 PM, 30 min
            </span>
            <span>
              <span className="mx-avs">
                {["MC", "RP", "PN", "DA"].map((i) => (
                  <span key={i} className="mx-av sm" aria-hidden="true">
                    {i}
                  </span>
                ))}
              </span>
              4 people
            </span>
          </div>
        </div>
        <div className="mx-actions">
          <button type="button" className="mx-btn is-outline tap">
            <UserPlus size={18} weight="bold" aria-hidden="true" />
            Invite people
          </button>
          <LinkButton href="/meetings/m-1/join">
            <VideoCamera size={18} weight="bold" aria-hidden="true" />
            Join meeting
          </LinkButton>
        </div>
      </header>
      <div className="md-cols">
        <div className="md-pair">
          <div className="md-col">
            {card(
              "When",
              <div className="md-when">
                <span className="md-date" aria-hidden="true">
                  <small>Nov</small>
                  <b>11</b>
                </span>
                <span className="md-when-text">
                  <strong>Wednesday, November 11, 4:00 PM to 4:30 PM</strong>
                  <span>Starts in 2 hours. The room opens when you join.</span>
                </span>
              </div>,
            )}
            {card("Your agent and this meeting", rows([["Attend yourself", "You join the call"], ["Send your agent", "It listens and reports back"], ["Skip it", "Nothing is kept for you"]]))}
          </div>
          <div className="md-col">
            {card("Agenda", rows([["What moved", "10 min, Maya"], ["What is stuck", "15 min, Raj"], ["Next steps", "5 min, Priya"]]), "0 of 3 done")}
            {card(
              "What your agent will do",
              <>
                <p className="mx-help">It joins the call with you. What it writes shows in your sidebar during the call and is yours only.</p>
                <ul className="md-plan">
                  {["Takes private notes for you while you talk. Only you can see them.", "Flags decisions as they are made and waits for your Confirm before saving one.", "Picks up action items with an owner and a due date, for you to approve.", "Suggests questions and brings in context from your earlier meetings."].map((t) => (
                    <li key={t}>
                      <span className="md-plan-ico" aria-hidden="true" />
                      <p>{t}</p>
                    </li>
                  ))}
                </ul>
              </>,
            )}
          </div>
        </div>
        <div className="md-col md-rail">
          {card(
            "Invited",
            <ul className="md-people">
              {Object.values(PEOPLE).map((p) => (
                <li key={p.name}>
                  <span className="mx-av" aria-hidden="true">
                    {p.name.slice(0, 2)}
                  </span>
                  <span className="md-person">
                    <strong>{p.name}</strong>
                    <span>{p.name.split(" ")[0].toLowerCase()}@example.com</span>
                  </span>
                </li>
              ))}
            </ul>,
            "4 people",
          )}
        </div>
      </div>
    </div>
  );
}

/* A flush card with a head and a short list, as the server pages draw them. */
function ListCard({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <Card as="section" flush>
      <CardHead title={title} />
      <CardBody>
        <ul className="cu-own-list">
          {items.map(([a, b]) => (
            <li key={a}>
              <span className="cu-own-title">{a}</span>
              <span className="cu-own-due">{b}</span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

/* The catch-up (an async server component): a copy of its frame from page.tsx. */
function CatchUpStub() {
  return (
    <Page>
      <PageHead
        title="Weekly sync"
        context={
          <span className="inline-flex items-center gap-2">
            <CalendarBlank size={18} aria-hidden="true" className="text-ink-4" />
            Tuesday, Nov 10, 30 min
          </span>
        }
        action={
          <LinkButton href="/meetings/m-1" variant="outline">
            Open the meeting
          </LinkButton>
        }
      >
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip tone="accent" icon={<Sparkle size={14} aria-hidden="true" />}>
            Catch-up
          </Chip>
        </div>
      </PageHead>
      <section className="cu-lead" aria-label="Summary">
        <div className="cu-lead-text">
          <p className="cu-sentence">You now own two tasks, the team decided to ship the beta on 2 December, and three of four agenda items were covered.</p>
        </div>
        <dl className="cu-stats">
          {[["Now yours", "2"], ["Decided", "1"], ["Agenda", "3 of 4"]].map(([a, b]) => (
            <div key={a}>
              <dt>{a}</dt>
              <dd>{b}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] xl:gap-6">
        <div className="flex min-w-0 flex-col gap-5 xl:gap-6">
          <ListCard title="Now yours" items={[["Draft the pricing page", "Due Friday"], ["Send Raj the numbers", "Due Thursday"]]} />
          <ListCard title="Your questions" items={[["Who owns the launch email?", "Answered by Priya"], ["Is the date firm?", "Answered by Maya"]]} />
        </div>
        <div className="flex min-w-0 flex-col gap-5 xl:gap-6">
          <ListCard title="Decided" items={[["Ship the beta on 2 December", "Confirmed by Maya"], ["Keep the free tier", "Confirmed by Raj"]]} />
          <ListCard title="Worth knowing" items={[["Diego is out next week", "Said by Diego"]]} />
        </div>
        <div className="flex min-w-0 flex-col gap-5 md:col-span-2 xl:col-span-1 xl:gap-6">
          <ListCard title="Agenda" items={[["What moved", "Covered"], ["What is stuck", "Covered"], ["Next steps", "Not reached"]]} />
        </div>
      </div>
    </Page>
  );
}

const SAYS = [
  "Morning everyone, let's start with what moved this week.",
  "The pricing page is drafted. I still need the numbers from finance before Thursday so we can review it properly with the whole team.",
  "I can send those today.",
  "Great. Then the beta date holds: 2 December.",
  "Onboarding notes are in the shared folder.",
  "Diego, can you take the launch email?",
  "Yes, I'll have a draft by Friday.",
  "Anything stuck?",
  "The analytics export is still slow, I'll look at it with Aiko.",
  "Thanks all, see you next week.",
];
const SPK = ["u-maya", "u-raj", "u-priya", "u-diego"];
const CHUNKS = SAYS.map((text, i) => ({ id: `c-${i}`, meeting_id: "m-1", speaker_id: SPK[i % 4], start_ms: i * 21000, end_ms: i * 21000 + 15000, text, is_final: true })) as unknown as TranscriptChunk[];
const LABELS = Object.fromEntries(SPK.map((id) => [id, PEOPLE[id].name]));

/* The transcript page hands plain data to TranscriptView (real). Its rail is the real Talk time
   panel and, in place of SpeakerMapping (it imports a server action this harness cannot load), a
   card of the same shape. */
function TranscriptPageStub() {
  const rail = (
    <>
      <Card as="section" flush>
        <CardHead title="Speakers" description="Transcription labels each voice it hears. Match each one to a teammate and the transcript reads by name." right={<span className="text-[14px] text-ink-3">All matched</span>} />
        <CardBody>
          <ul className="tx-spk-list">
            {SPK.slice(0, 3).map((id) => (
              <li key={id} className="tx-spk-row">
                <div className="tx-spk-top">
                  <span className="mx-av sm tx-spk-av" aria-hidden="true">
                    1
                  </span>
                  <strong>{PEOPLE[id].name}</strong>
                  <small>3 lines</small>
                  <Chip tone="ok">Matched</Chip>
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
      <TalkTimePanel chunks={CHUNKS} speakers={[]} speakerLabels={LABELS} />
    </>
  );
  return <TranscriptView chunks={CHUNKS} speakerLabels={LABELS} title="Weekly sync" meta="Transcript, Tuesday, November 10, 30 minutes, 4 speakers." backHref="/meetings/m-1" rail={rail} />;
}

/* Listening (an async server component that hands data to client views): its frame copied from
   page.tsx, with the real week, digest, raised list and rules views on the listening fixtures. */
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

const L_MEETINGS: WeekMeeting[] = [
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
  meetings: L_MEETINGS,
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
    { text: "Your agent sat in on 2 meetings for you today. In " },
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


function ListeningStub() {
  return (
    <Page>
      <PageHead
        title="Listening"
        context="8 meetings this week: you attend 3, your agent listens to 4, you skip 1. Your agent pulls you in only when something needs you."
        action={
          <LinkButton href="/settings/listening" variant="outline">
            <GearSix size={16} aria-hidden />
            Interruptions and lines
          </LinkButton>
        }
      />
      <SectionTabs section="meetings" label="Meetings sections" exact={["/meetings"]} className="mb-5" />
      <ListeningWeekView week={WEEK} today="2026-11-11" />
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-5">
          <Card as="section" flush>
            <CardHead title="Evening digest" caption="What your agent heard while you were elsewhere" divided />
            <CardBody className="pt-4">
              <EveningDigestBody digest={DIGEST} />
            </CardBody>
          </Card>
          <InterruptionList items={RAISED} failed={false} nowIso={NOW_ISO} />
        </div>
        <aside aria-label="Rules" className="min-w-0 space-y-5">
          <RulesPanel rules={WEEK.rules} templates={[]} />
          <section className="rounded-card bg-bg-2 px-4 py-[18px] sm:px-6">
            <h2 className="display text-[20px] text-ink">What your agent respects</h2>
            <ul className="mt-2 space-y-2 text-[14.5px] leading-relaxed text-ink-2">
              <li>It only listens to meetings you are invited to.</li>
              <li>Never to a confidential meeting, and never to anything said off the record.</li>
              <li>The room sees how many agents are listening, so nobody is listened to without knowing.</li>
              <li>It says only what you wrote or saved beforehand. Everything else waits for you.</li>
            </ul>
          </section>
        </aside>
      </div>
    </Page>
  );
}
const NOW_ISO = "2026-11-11T09:30:00.000Z";

const DECISIONS: DecisionView[] = [
  "Ship the beta on 2 December",
  "Keep the free tier for teams under five",
  "SMB tier discount floor is 15%",
  "Move the launch email to the Tuesday after the beta",
  "Diego owns the pricing page",
  "Hold the analytics export until Aiko's fix lands",
  "Weekly sync moves to Wednesday",
  "No new contractors this quarter",
].map((content, i) => ({
  id: `d-${i}`,
  meetingId: `m-${i % 3}`,
  meetingTitle: ["Weekly sync", "Pricing review", "Q4 launch review"][i % 3],
  content,
  rationale: i % 2 ? null : "Raj confirmed the numbers with finance and the team agreed it leaves room for the enterprise tier.",
  status: i < 6 ? "confirmed" : "superseded",
  supersedes: null,
  supersededBy: null,
  recordedAt: new Date(Date.UTC(2026, 10, 10 - i, 15)).toISOString(),
}));

/* A decision's page (async server component): a copy of its frame from page.tsx, with stand-in
   cards of the same kit for the client sections (why, bet, reach). */
function DecisionStub() {
  return (
    <Page>
      <PageHead
        title="Ship the beta on 2 December"
        action={
          <LinkButton href="/meetings/m-1" variant="outline">
            <VideoCamera size={16} aria-hidden />
            Open meeting
          </LinkButton>
        }
        context={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Chip tone="ok" icon={<CheckCircle size={14} weight="fill" />}>
              Confirmed Nov 10, 3:40 PM UTC
            </Chip>
          </span>
        }
      />
      <PageColumns
        sticky={false}
        aside={
          <div className="flex flex-col gap-5">
            <Card as="section" flush>
              <CardHead title="Who this reaches" description="Teams and tools that hear about it." divided />
              <CardBody className="pt-4">
                <ul className="flex flex-col gap-3">
                  {["Platform team", "Slack #launch", "Linear"].map((t) => (
                    <li key={t} className="flex items-center gap-3 text-[15px] text-ink">
                      <span className="h-9 w-9 rounded-ctl bg-bg-2" />
                      {t}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
            <Note>Only confirmed decisions appear in a lineage. Nothing your agent proposed is saved until someone confirms it.</Note>
          </div>
        }
      >
        <Card as="section" flush>
          <CardHead title="Why we decided" description="In the words of the meeting." divided />
          <CardBody className="pt-4">
            <p className="text-[15px] leading-relaxed text-ink-2">QA signed off on the beta and the pricing page is ready, so the date holds.</p>
          </CardBody>
        </Card>
        <SectionCard title="Lineage" description="Replaces 1 earlier decision. Oldest first.">
          <ol className="relative px-4 py-5 sm:px-[22px]">
            {["Ship the beta in November", "Ship the beta on 2 December"].map((t) => (
              <li key={t} className="relative flex gap-4 pb-6 last:pb-0">
                <span className="relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-[var(--signal-line)] bg-surface" />
                <div className="min-w-0 pt-1">
                  <p className="text-[15px] font-medium leading-snug text-ink-2">{t}</p>
                  <p className="mt-1 text-[12.5px] text-ink-3">Weekly sync, Nov 3</p>
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>
        <Card as="section" flush>
          <CardHead title="What it should achieve" description="Say what this decision should achieve and by when." divided />
          <CardBody className="pt-4">
            <p className="text-[15px] text-ink-2">No bet yet.</p>
          </CardBody>
        </Card>
      </PageColumns>
    </Page>
  );
}

/* The collaboration log (async server component): its frame copied from page.tsx. */
function CollaborationsStub() {
  const th = "px-5 py-2.5 text-left text-[12.5px] font-semibold text-ink-3";
  const rows = [0, 1, 2, 3, 4];
  return (
    <Page>
      <PageHead
        title="Agent collaboration"
        context={
          <>
            When someone&rsquo;s agent needed context they were missing, it asked another agent or their own knowledge base. Every request is
            logged here, including the ones policy refused. What was shared is never shown here.
          </>
        }
        action={
          <LinkButton href="/meetings/m-1" variant="outline">
            Open the meeting
          </LinkButton>
        }
      />
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Requests" value={5} />
          <StatCard label="Answered" value={4} />
          <StatCard label="Denied or blocked" value={1} />
          <StatCard label="Median latency" value="420 ms" />
        </div>
        <Card as="section" flush aria-label="Collaboration log">
          <table className="hidden w-full border-collapse text-left text-[14px] md:table">
            <thead>
              <tr className="bg-surface-2">
                {["Time", "Who asked whom", "Where", "Asked for", "Scope", "Result", "Latency"].map((h) => (
                  <th key={h} scope="col" className={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap px-5 py-3.5 text-[12.5px] text-ink-3">3:4{i} PM</td>
                  <td className="max-w-[300px] px-5 py-3.5">Raj&rsquo;s agent to Maya&rsquo;s</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-ink-2">Agent to agent</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-ink-2">A fact</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-ink-2">This meeting</td>
                  <td className="px-5 py-3.5">
                    <Chip tone="ok">Answered</Chip>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right text-ink-2">4{i}0 ms</td>
                </tr>
              ))}
            </tbody>
          </table>
          <ul className="divide-y divide-line md:hidden">
            {rows.slice(0, 3).map((i) => (
              <li key={i} className="px-4 py-4 text-[14px]">
                <div className="flex items-center justify-between gap-3">
                  <span>Raj&rsquo;s agent to Maya&rsquo;s</span>
                  <Chip tone="ok">Answered</Chip>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
                  {[["Where", "Agent to agent"], ["Asked for", "A fact"], ["Scope", "This meeting"], ["When", "3:40 PM, 420 ms"]].map(([a, b]) => (
                    <div key={a}>
                      <dt className="text-ink-3">{a}</dt>
                      <dd className="text-ink-2">{b}</dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Page>
  );
}

/* What is recorded (async server component): its frame copied from page.tsx. */
function RecordStub() {
  return (
    <Page>
      <PageHead
        title="What is recorded"
        context="Your agreement for Weekly sync, Tuesday, November 10, and the stretches that were off the record."
        action={
          <LinkButton href="/meetings/m-1" variant="outline">
            Open the meeting
          </LinkButton>
        }
      />
      <PageGrid cols={2}>
        <Card as="section">
          <CardHead title="Your receipt" caption="Only you can see this." divided />
          <CardBody>
            <ul className="mt-4 flex flex-col gap-3 text-[15px] text-ink-2">
              {["The transcript is kept with the meeting.", "Your agent's notes are yours.", "Nothing is decided without someone confirming it.", "Anyone can ask to go off the record."].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <ShieldCheck size={20} aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card as="section">
          <CardHead title="Off the record" caption="2 times, 6 minutes in all" divided />
          <CardBody>
            <ol className="mt-4 grid gap-3">
              {["3:12 PM to 3:15 PM, 3 minutes", "3:30 PM to 3:33 PM, 3 minutes"].map((t) => (
                <li key={t} className="flex items-start gap-3 rounded-ctl bg-surface-2 px-3.5 py-3">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-ink">{t}</p>
                    <p className="text-[14px] text-ink-2">Nothing said in this stretch was transcribed, indexed or seen by any agent.</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </PageGrid>
    </Page>
  );
}

type Entry = { skeleton: () => ReactNode; page: () => ReactNode; meet?: boolean; bare?: boolean };

const ENTRIES: Record<string, Entry> = {
  decision: { meet: true, skeleton: () => <DecisionLoading />, page: () => <DecisionStub /> },
  collaborations: { meet: true, skeleton: () => <CollaborationsLoading />, page: () => <CollaborationsStub /> },
  record: { meet: true, skeleton: () => <RecordLoading />, page: () => <RecordStub /> },
  calls: {
    skeleton: () => <CallsLoading />,
    page: () => (
      <Page>
        <PageHead
          title="How good are our calls"
          context="Every decision can carry a bet on what it will achieve. When the date comes, its owner scores it. This is what the workspace learns from them."
          action={
            <LinkButton href="/decisions/time-machine" variant="outline">
              <ClockCounterClockwise size={16} aria-hidden />
              Time machine
            </LinkButton>
          }
        />
        <CallsReport cal={CALIBRATION} mine={MINE} today={TODAY} />
      </Page>
    ),
  },
  "time-machine": {
    skeleton: () => <TimeMachineLoading />,
    page: () => (
      <Page>
        <PageHead
          title="Time machine"
          context="See the company as it understood itself on any date: what was decided and why, who had promised what, and what changed since. Only meetings you were in."
          action={
            <LinkButton href="/decisions/calls" variant="outline">
              <Target size={16} aria-hidden />
              How good are our calls
            </LinkButton>
          }
        />
        <TimeMachine
          initial={{ mode: "as-of", asOf: "2026-07-31", from: "2026-06-01", to: "2026-10-31", topic: "" }}
          initialData={{ mode: "as-of", result: { ok: true, data: SNAPSHOT } }}
          today={TODAY}
          earliest="2026-06-10"
        />
      </Page>
    ),
  },
  decisions: { skeleton: () => <DecisionsLoading />, page: () => <DecisionsLog decisions={DECISIONS} /> },
  listening: { meet: true, skeleton: () => <ListeningLoading />, page: () => <ListeningStub /> },
  transcript: { meet: true, skeleton: () => <TranscriptLoading />, page: () => <TranscriptPageStub /> },
  "catch-up": { meet: true, skeleton: () => <CatchUpLoading />, page: () => <CatchUpStub /> },
  meeting: { meet: true, skeleton: () => <MeetingLoading />, page: () => <MeetingDetailStub /> },
  meetings: {
    meet: true,
    skeleton: () => <MeetingsLoading />,
    page: () => (
      <Page>
        <PageHead
          title="Meetings"
          context="Every call on your calendar, what your agent captured, and where to pick it up."
          action={<NewMeeting members={[]} recent={[]} me={{ id: "u-maya", name: "Maya Chen" }} templates={[]} goals={[]} />}
        />
        <SectionTabs section="meetings" label="Meetings sections" exact={["/meetings"]} className="mb-5" />
        <MeetingsHub meetings={MEETINGS} people={PEOPLE} invitable={[]} me={{ id: "u-maya", name: "Maya Chen" }} templates={[]} goals={[]} />
      </Page>
    ),
  },
};

export function MeetPair({ id, mode, theme = "light" }: { id: string; mode: "skeleton" | "page"; theme?: Theme }) {
  const e = ENTRIES[id];
  return (
    <Shell theme={theme} meet={e.meet} bare={e.bare}>
      {mode === "skeleton" ? e.skeleton() : e.page()}
    </Shell>
  );
}
