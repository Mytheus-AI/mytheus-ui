import type { ReactNode } from "react";
import { Shell, type Theme } from "./Shell";
import { NOW } from "./fixtures";
import { BRIEFING, SETTINGS } from "../briefing-fixture";

import AppLoading from "../../../src/app/(app)/loading";
import DashboardLoading from "../../../src/app/(app)/dashboard/loading";
import DigestLoading from "../../../src/app/(app)/digest/loading";
import SearchLoading from "../../../src/app/(app)/search/loading";
import WelcomeLoading from "../../../src/app/(app)/welcome/loading";
import AgentLoading from "../../../src/app/(app)/agent/loading";
import CaptureLoading from "../../../src/app/(app)/capture/loading";
import ConnectLoading from "../../../src/app/(app)/capture/connect/loading";
import BriefingsLoading from "../../../src/app/(app)/briefings/loading";
import BriefingLoading from "../../../src/app/(app)/briefings/[briefingId]/loading";

import { Page, PageGrid, PageHead } from "../../../src/components/ui/Page";
import { Card, CardBody, CardHead, cardClass, cardPadX } from "../../../src/components/ui/Card";
import { Chip } from "../../../src/components/ui/Chip";
import { Avatar } from "../../../src/components/ui/Avatar";
import { LinkButton } from "../../../src/components/ui/Button";
import { DashboardHeader } from "../../../src/components/app/dashboard/DashboardHeader";
import { HeroUpNext } from "../../../src/components/app/dashboard/HeroUpNext";
import { NeedsYou } from "../../../src/components/app/dashboard/NeedsYou";
import { RecentMeetings } from "../../../src/components/app/dashboard/RecentMeetings";
import { TodayTimeline } from "../../../src/components/app/dashboard/TodayTimeline";
import { TaskList } from "../../../src/components/app/dashboard/TaskList";
import { MyNotes } from "../../../src/components/app/dashboard/MyNotes";
import { RecentDecisions } from "../../../src/components/app/dashboard/RecentDecisions";
import type { HomeMeeting } from "../../../src/components/app/dashboard/types";
import { CardSkeleton } from "../../../src/components/ui/Page";
import { DigestSections } from "../../../src/components/digest/DigestSections";
import { WeekPicker } from "../../../src/components/digest/WeekPicker";
import { AskView } from "../../../src/components/search/AskView";
import { WelcomeVocabulary } from "../../../src/components/org-brain/WelcomeVocabulary";
import { AgentWorkspace } from "../../../src/components/agent/AgentWorkspace";
import { ListeningCard } from "../../../src/components/agent/ListeningCard";
import { KeptNotes } from "../../../src/components/agent/KeptNotes";
import { BriefingPlayer } from "../../../src/components/briefing/BriefingPlayer";
import type { WeeklyDigest } from "../../../src/lib/api/only-mytheus-types";
import type { UserProfile } from "../../../src/lib/api/profile-types";
import type { GlossaryTerm } from "../../../src/lib/api/org-brain-types";
import type { DashboardDecision, DashboardNote, DashboardRecentMeeting, DashboardReviewItem } from "../../../src/lib/api/types";
import type { MineTask } from "../../../src/lib/api/tasks";

/* Skeleton and page pairs, Home group: each route's loading.tsx against the page as it looks
   loaded. Real view components with sample data where the page hands its data to them (Home's
   panels, DigestSections, AskView, AgentWorkspace, BriefingPlayer); where the page itself is the
   async server component that lays the frame out (welcome, capture, capture/connect, the digest's
   head and topics row, the briefings frame), the frame is copied here from page.tsx with sample
   data, around the real kit components. */

const NOW_MS = Date.parse(NOW);
const at = (h: number, m = 0) => new Date(Date.UTC(2026, 10, 11, h, m)).toISOString();

/* ---------- Home ---------- */
const NEXT: HomeMeeting = {
  id: "m-1",
  title: "Pricing review with the launch team",
  startTime: at(11),
  endTime: at(11, 45),
  status: "upcoming",
  participants: ["Maya Chen", "Raj Patel", "Priya Nair", "Diego Ruiz"],
};
const LATER: HomeMeeting = { id: "m-2", title: "Weekly sync", startTime: at(14), endTime: at(14, 30), status: "upcoming", participants: ["Maya Chen", "Sarah Kim"] };
const STANDUP: HomeMeeting = { id: "m-0", title: "Standup", startTime: at(8, 30), endTime: at(8, 45), status: "past", participants: ["Maya Chen"] };
const REVIEW: DashboardReviewItem[] = [
  { id: "r-1", kind: "decision", content: "Ship the beta on 2 December", meeting_id: "m-0", meeting_title: "Weekly sync", created_at: at(8) },
  { id: "r-2", kind: "action", content: "Diego drafts the pricing page", meeting_id: "m-0", meeting_title: "Weekly sync", created_at: at(8) },
] as DashboardReviewItem[];
const RECENT: DashboardRecentMeeting[] = [
  { id: "m-7", title: "Launch planning", created_at: at(7), scheduled_start: at(7), scheduled_end: at(7, 45), participant_count: 5, decision_count: 2, action_count: 3 },
  { id: "m-8", title: "Design crit", created_at: at(6), scheduled_start: at(6), scheduled_end: at(6, 30), participant_count: 3, decision_count: 1, action_count: 1 },
  { id: "m-9", title: "Hiring sync", created_at: at(5), scheduled_start: at(5), scheduled_end: at(5, 30), participant_count: 4, decision_count: 0, action_count: 2 },
] as DashboardRecentMeeting[];
const TASKS: MineTask[] = [
  { id: "t-1", assignee_id: "u-maya", confidence: 0.9, content: "Send Raj the pricing numbers", created_at: at(7), due_date: "2026-11-12", meeting_id: "m-7", meeting_title: "Launch planning", status: "confirmed" },
  { id: "t-2", assignee_id: "u-maya", confidence: 0.9, content: "Book the design review", created_at: at(7), due_date: "2026-11-14", meeting_id: "m-8", meeting_title: "Design crit", status: "confirmed" },
  { id: "t-3", assignee_id: "u-maya", confidence: 0.9, content: "Share the onboarding notes", created_at: at(7), due_date: null, meeting_id: null, meeting_title: null, status: "confirmed" },
] as MineTask[];
const NOTES: DashboardNote[] = [
  { id: "n-1", content: "Raj wants the pricing numbers before Thursday", created_at: at(7), meeting_id: "m-7", meeting_title: "Launch planning" },
  { id: "n-2", content: "Priya owns the onboarding checklist", created_at: at(6), meeting_id: "m-8", meeting_title: "Design crit" },
] as DashboardNote[];
const DECISIONS: DashboardDecision[] = [
  { id: "d-1", content: "Price the team plan at 49 dollars", created_at: at(7), meeting_id: "m-7", meeting_title: "Launch planning", rationale: null },
  { id: "d-2", content: "Ship the beta on 2 December", created_at: at(6), meeting_id: "m-8", meeting_title: "Design crit", rationale: null },
] as DashboardDecision[];

function DashboardPage() {
  return (
    <Page>
      <DashboardHeader firstName="Maya" nowIso={NOW} nowMs={NOW_MS} next={NEXT} calendarFailed={false} todayCount={3} openTasks={3} needsYou={2} />
      <div className="grid grid-cols-1 items-start gap-6 min-[1101px]:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <div className="flex min-w-0 flex-col gap-7">
          <HeroUpNext next={NEXT} after={LATER} calendarFailed={false} nowMs={NOW_MS} />
          <CardSkeleton rows={2} />
          <NeedsYou items={REVIEW} failed={false} />
          <RecentMeetings meetings={RECENT} failed={false} />
          <CardSkeleton rows={2} />
        </div>
        <aside className="grid min-w-0 grid-cols-1 items-start gap-5 min-[721px]:grid-cols-2 min-[1101px]:flex min-[1101px]:flex-col min-[1101px]:items-stretch">
          <TodayTimeline today={[STANDUP, NEXT, LATER]} later={[]} nextId={NEXT.id} calendarFailed={false} nowMs={NOW_MS} />
          <TaskList tasks={TASKS} failed={false} nowIso={NOW} />
          <MyNotes notes={NOTES} failed={false} />
          <RecentDecisions decisions={DECISIONS} failed={false} className="min-[721px]:col-span-2 min-[1101px]:col-span-1" />
        </aside>
      </div>
    </Page>
  );
}

/* ---------- Digest ---------- */
const DIGEST: WeeklyDigest = {
  id: "dg-1",
  week_start: "2026-11-02",
  week_end: "2026-11-08",
  created_at: "2026-11-09T07:00:00Z",
  topics: ["pricing", "launch plan"],
  item_count: 7,
  decisions: [
    { id: "d1", content: "Price the team plan at 49 dollars", meeting_id: "m-7", meeting_title: "Launch planning", decided_at: "2026-11-03T10:00:00Z", matched_topics: ["pricing"] },
    { id: "d2", content: "Ship the beta on 2 December", meeting_id: "m-8", meeting_title: "Design crit", decided_at: "2026-11-04T10:00:00Z", matched_topics: ["launch plan"] },
  ],
  decision_changes: [
    { old_decision_id: "d0", new_decision_id: "d1", old_content: "Price the team plan at 39 dollars", new_content: "Price the team plan at 49 dollars", meeting_id: "m-7", meeting_title: "Launch planning", changed_at: "2026-11-03T10:00:00Z" },
  ],
  actions_assigned: [
    { id: "a1", content: "Send Raj the pricing numbers", meeting_id: "m-7", meeting_title: "Launch planning", due_date: "2026-11-12", status: "confirmed", changed_at: null },
    { id: "a2", content: "Book the design review", meeting_id: "m-8", meeting_title: "Design crit", due_date: null, status: "confirmed", changed_at: null },
  ],
  actions_closed: [{ id: "a3", content: "Draft the FAQ", meeting_id: null, meeting_title: null, due_date: null, status: "done", changed_at: "2026-11-05T10:00:00Z" }],
  promises_due: [
    { kind: "action", id: "a1", content: "Send Raj the pricing numbers", due_date: "2026-11-12", due_hint: null, meeting_id: "m-7", meeting_title: "Launch planning" },
    { kind: "commitment", id: "c1", content: "Review Priya's onboarding notes", due_date: null, due_hint: "by Friday", meeting_id: null, meeting_title: null },
  ],
} as WeeklyDigest;

function DigestPage() {
  return (
    <Page>
      <PageHead
        title="What changed for you"
        context="Nov 2 to 8, 2026. 7 things changed for you."
        action={
          <>
            <WeekPicker
              options={[
                { value: "dg-1", label: "Week of Nov 2", href: "/digest?week=dg-1" },
                { value: "preview", label: "This week so far", href: "/digest?preview=1" },
              ]}
              value="dg-1"
            />
            <LinkButton href="/settings/notifications" variant="ghost" icon aria-label="Digest settings">
              <span aria-hidden className="h-[18px] w-[18px]" />
            </LinkButton>
          </>
        }
      >
        <p className="mt-1 text-[14px] text-ink-3">The next one arrives Monday, 7:00 AM.</p>
      </PageHead>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-[14px] font-semibold text-ink-3">Your topics</span>
        <Chip tone="accent">pricing</Chip>
        <Chip tone="accent">launch plan</Chip>
        <a href="/agent" className="text-[15px] font-semibold text-signal-ink underline">
          Change topics
        </a>
      </div>
      <DigestSections digest={DIGEST} />
    </Page>
  );
}

/* ---------- Welcome (frame copied from welcome/page.tsx) ---------- */
const TERMS: GlossaryTerm[] = ["Launch room", "Beta cohort", "North star", "Team plan", "Ledger", "Settle"].map((t, i) => ({
  id: `g-${i}`,
  term: t,
  kind: "product",
  definition: "What the team means by it, in one plain sentence.",
  aliases: [],
  created_at: NOW,
  updated_at: NOW,
})) as GlossaryTerm[];

function Person({ name }: { name: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar name={name} id={name} size="sm" />
      <span className="truncate font-medium text-ink">{name}</span>
    </span>
  );
}

function WelcomePage() {
  return (
    <Page>
      <article aria-labelledby="welcome-h" className="space-y-5">
        <PageHead id="welcome-h" title="Welcome to Acme" context="Your welcome brief, about 4 minutes to read." />
        <Card as="section" aria-labelledby="about-h" className="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <h2 id="about-h" className="text-[17px] font-semibold leading-snug text-ink">
              What we do
            </h2>
            <p className="mt-2 max-w-[68ch] whitespace-pre-line text-pretty text-[17px] leading-relaxed text-ink-2">
              Acme makes meeting agents for product teams. Every person brings an agent that keeps what was decided and who owes what, so the next meeting starts where the last one ended.
            </p>
          </div>
          <dl className="grid content-start gap-5 rounded-ctl bg-bg-2 p-5 lg:self-start">
            <div>
              <dt className="text-[12.5px] font-semibold text-ink-3">Industry</dt>
              <dd className="mt-1 text-[15px] font-medium text-ink">Software</dd>
            </div>
            <div>
              <dt className="text-[12.5px] font-semibold text-ink-3">What we make</dt>
              <dd className="mt-1.5 flex flex-wrap gap-1.5">
                <Chip tone="accent">Meeting agents</Chip>
                <Chip tone="accent">Minutes</Chip>
              </dd>
            </div>
          </dl>
        </Card>
        <div className="grid items-start gap-5 lg:grid-cols-2 xl:grid-cols-12">
          <Card as="section" flush aria-labelledby="goals-h" className="xl:col-span-5">
            <CardHead id="goals-h" title="What matters now" right={<Chip>3 active</Chip>} />
            <CardBody>
              <ol className="space-y-4">
                {["Ship the beta by December", "Halve onboarding time", "Win the first ten teams"].map((g, i) => (
                  <li key={g} className="flex gap-3.5">
                    <span aria-hidden className="display w-6 shrink-0 text-right text-[22px] leading-none tabular-nums text-signal-ink">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold leading-snug text-ink">{g}</p>
                      <p className="mt-1 text-[14px] leading-relaxed text-ink-3">Why it matters this quarter, in a sentence.</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
          <Card as="section" flush aria-labelledby="owners-h" className="xl:col-span-4">
            <CardHead id="owners-h" title="Who to ask" />
            <CardBody>
              <ul className="divide-y divide-line">
                {[
                  ["Raj Patel", "Pricing"],
                  ["Priya Nair", "Onboarding"],
                  ["Diego Ruiz", "Design"],
                ].map(([n, t]) => (
                  <li key={n} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <Person name={n} />
                    <span className="min-w-0 max-w-[60%] text-right text-[14px] leading-snug text-ink-2">{t}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
          <Card as="section" flush tone="well" aria-labelledby="team-h" className="lg:col-span-2 xl:col-span-3">
            <CardHead id="team-h" title="Your team" />
            <CardBody>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1">
                {["Sarah Kim", "Tomas Ferreira", "Aiko Tanaka"].map((n) => (
                  <li key={n} className="flex min-w-0 items-center gap-3">
                    <Avatar name={n} id={n} size="md" />
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold text-ink">{n}</span>
                      <span className="block truncate text-[12.5px] text-ink-3">{n.split(" ")[0].toLowerCase()}@acme.com</span>
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
        <Card as="section" flush aria-labelledby="vocab-h">
          <CardHead id="vocab-h" title="Words you will hear" right={<Chip>6 words</Chip>} />
          <CardBody>
            <WelcomeVocabulary terms={TERMS} />
          </CardBody>
        </Card>
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Card as="section" flush aria-labelledby="never-h">
            <CardHead id="never-h" title="What agents never note" />
            <CardBody>
              <ul className="flex flex-wrap gap-2">
                {["Salaries", "Health", "Hiring decisions"].map((t) => (
                  <li key={t}>
                    <Chip tone="outline">{t}</Chip>
                  </li>
                ))}
              </ul>
              <p className="mt-3 max-w-[68ch] text-[14px] leading-relaxed text-ink-3">
                Agents are told to keep no notes, suggestions or actions when a meeting is mainly about these. It is an instruction to them, not a guarantee, and the transcript is still recorded.
              </p>
            </CardBody>
          </Card>
          <Card as="section" tone="well" aria-labelledby="next-h">
            <h2 id="next-h" className="display text-[22px] text-ink">
              Your agent is ready
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">It already knows all of the above, and it listens for your work in every meeting you join.</p>
            <div className="mt-4">
              <LinkButton href="/agent" variant="outline">
                Meet your agent
              </LinkButton>
            </div>
          </Card>
        </div>
      </article>
    </Page>
  );
}

/* ---------- Agent ---------- */
const PROFILE: UserProfile = {
  id: "u-maya",
  email: "maya@example.com",
  avatar_url: null,
  role: "Product lead",
  skills: ["Pricing", "Roadmap"],
  bio: null,
  listen_for: ["Launch plan", "Pricing"],
  ignore_topics: ["Hiring"],
  agent_name: "Juniper",
  agent_avatar_seed: null,
  agent_personality: "balanced",
  agent_instructions: null,
  created_at: NOW,
  updated_at: NOW,
};

function AgentPage() {
  const aside = (
    <>
      <ListeningCard profile={PROFILE} />
      <Card as="section" flush aria-labelledby="watch-h">
        <CardHead
          id="watch-h"
          title="Topics you watch"
          description="When one of these comes up in a meeting you are not in, your agent tells you. It only covers meetings you are allowed to see, and never confidential ones."
        />
        <CardBody>
          <div className="h-11 rounded-ctl border border-line-2" />
        </CardBody>
      </Card>
      <KeptNotes notes={NOTES} />
    </>
  );
  return (
    <Page className="pt-2">
      <AgentWorkspace profile={PROFILE} personName="Maya Chen" aside={aside} />
    </Page>
  );
}

/* ---------- Capture (frames copied from capture/page.tsx and capture/connect/page.tsx) ---------- */
function CapturePage() {
  return (
    <div className="mx-auto w-full max-w-[1360px]">
      <PageHead
        title="Capture"
        context="Bring calls on Google Meet, Microsoft Teams and Zoom into Mytheus, with no bot joining. Your agent, notes, decisions and minutes work on them like any Mytheus meeting."
        action={<LinkButton href="/api/capture/extension"><span aria-hidden className="h-[18px] w-[18px]" />Download for Chrome</LinkButton>}
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-6">
        <section aria-labelledby="captured-calls" className="min-w-0">
          <div className="overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
            <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-5 py-3">
              <h2 id="captured-calls" className="text-[15px] font-semibold text-ink">
                Captured calls
              </h2>
              <span className="text-[13.5px] text-ink-3">4 calls</span>
            </div>
            <ul className="divide-y divide-line">
              {["Launch planning", "Pricing review with Raj", "Design crit", "Hiring sync"].map((t) => (
                <li key={t}>
                  <a href="/meetings/m-1" className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-5 py-4 sm:grid-cols-[150px_minmax(0,1fr)_auto_auto]">
                    <span className="text-[13.5px] font-semibold text-ink-3">Google Meet</span>
                    <span className="col-span-2 min-w-0 truncate text-[16px] font-semibold text-ink sm:col-span-1">{t}</span>
                    <span className="text-[14px] text-ink-3">Nov 10, 3:00 PM</span>
                    <Chip tone="ok" className="justify-self-end">
                      Done
                    </Chip>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <aside className="flex flex-col gap-5">
          <Card className="p-6">
            <h2 className="display text-[21px] text-ink">Set it up once</h2>
            <ol className="mt-4 flex flex-col gap-4">
              {[
                ["Download the extension", "Unzip it into a folder you will keep; Chrome loads it from there."],
                ["Load it in Chrome", "Open chrome://extensions, switch on Developer mode, choose Load unpacked and pick the folder. Pin Mytheus Capture to the toolbar."],
                ["Connect your account", "Click the Mytheus icon and choose Connect your Mytheus account. One click on the page that opens."],
                ["Capture a call", "Join a call on Google Meet, Teams or the Zoom web client, click the icon, tell everyone, and start transcribing."],
              ].map(([title, body], i) => (
                <li key={title} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
                  <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-signal-soft text-[13.5px] font-semibold text-signal-ink">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold text-ink">{title}</p>
                    <p className="mt-0.5 text-[14px] leading-relaxed text-ink-3">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
          <Card className="p-6">
            <h2 className="display text-[21px] text-ink">What it records</h2>
            <ul className="mt-4 flex flex-col gap-3.5 text-[14.5px] leading-relaxed text-ink-2">
              {[
                "The meeting tab's audio: everyone else on the call, told apart as Speaker 1, Speaker 2 and so on. You keep hearing the call as usual.",
                "Your microphone, as you. Without it your own words would be missing.",
                "Only while you transcribe. A bar on the meeting page says so the whole time, and capture stops when you press Stop, leave the call or close the tab.",
                "Tell everyone first. Mytheus asks you to confirm you did before every capture, keeps that confirmation with the meeting, and gives you a note to paste into the chat.",
              ].map((t) => (
                <li key={t} className="grid grid-cols-[22px_minmax(0,1fr)] gap-3">
                  <span aria-hidden className="mt-0.5 h-5 w-5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[13.5px] leading-relaxed text-ink-3">
              Chrome on a computer only. The Zoom desktop app is not supported; join from the browser instead. About Chrome extensions
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function ConnectPage() {
  return (
    <div className="mx-auto w-full max-w-[1360px]">
      <PageHead title="Connect Mytheus Capture" context="Let the Chrome extension bring your calls on Google Meet, Microsoft Teams and Zoom into this workspace." />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-6">
        <Card className="p-6 sm:p-7">
          <div className="flex flex-col gap-3">
            <h2 className="display text-[22px] text-ink">Open this page from the extension</h2>
            <p className="text-[15px] leading-relaxed text-ink-2">
              Click the Mytheus icon in Chrome&apos;s toolbar and choose Connect your Mytheus account. If you do not have the extension yet, get it from the Capture page.
            </p>
            <div>
              <LinkButton href="/capture">Get the extension</LinkButton>
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="text-[15px] font-semibold text-ink-3">Signed in as</h2>
          <p className="mt-1.5 break-words text-[17px] font-semibold text-ink">maya@example.com</p>
          <p className="mt-4 text-[14.5px] leading-relaxed text-ink-3">
            Captures you start appear in Meetings under this account and workspace, with their notes, decisions and minutes. Disconnect any time from the extension, or sign out of Mytheus.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ---------- Briefings (frames copied from briefings/page.tsx and [briefingId]/page.tsx) ---------- */
function BriefingsPage() {
  return (
    <Page>
      <PageHead
        title="Your briefings"
        context="Your agent tells you what changed for you, who is waiting on you, your promises and what is still open. Only you hear these."
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-6">
        <div className="min-w-0">
          <BriefingPlayer initial={BRIEFING} canRequest enabled preferences={SETTINGS} variant="full" />
        </div>
        <aside aria-label="Earlier briefings" className="min-w-0">
          <section aria-labelledby="brf-earlier" className={cardClass({ flush: true })}>
            <CardHead id="brf-earlier" title="Earlier briefings" divided />
            <ul className="divide-y divide-line">
              {["Monday: 4 decisions, 2 promises", "Friday: the launch plan moved", "Thursday: Raj is waiting on you"].map((t) => (
                <li key={t}>
                  <a href="/briefings/b-0" className={`flex items-center justify-between gap-3 py-3 hover:bg-surface-2 ${cardPadX}`}>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold text-ink">{t}</span>
                      <span className="block text-[13.5px] text-ink-3">Nov 10, 8:00 AM</span>
                    </span>
                    <Chip tone="outline">2:40</Chip>
                  </a>
                </li>
              ))}
            </ul>
            <p className={`border-t border-line py-3 text-[14px] text-ink-3 ${cardPadX}`}>Length, language, voice and auto-play are in Briefing settings.</p>
          </section>
        </aside>
      </div>
    </Page>
  );
}

function BriefingPage() {
  return (
    <Page width="read">
      <PageHead
        title="Your briefing"
        context="Only you hear this. Every point opens the moment it came from."
        action={
          <LinkButton href="/meetings/m-1" variant="outline" size="sm">
            Open the meeting
          </LinkButton>
        }
      />
      <BriefingPlayer initial={BRIEFING} meetingId={BRIEFING.meeting_id ?? null} canRequest={false} preferences={SETTINGS} variant="full" />
    </Page>
  );
}

/* ---------- The (app) fallback: the generic frame it stands in for ---------- */
function GenericPage() {
  return (
    <Page>
      <PageHead title="A page" context="One line of context about the page." />
      <PageGrid>
        <Card>One card</Card>
        <Card>Another card</Card>
        <Card className="md:col-span-2">A card across</Card>
      </PageGrid>
    </Page>
  );
}

type Entry = { skeleton: () => ReactNode; page: () => ReactNode };

const ENTRIES: Record<string, Entry> = {
  "app-root": { skeleton: () => <AppLoading />, page: () => <GenericPage /> },
  dashboard: { skeleton: () => <DashboardLoading />, page: () => <DashboardPage /> },
  digest: { skeleton: () => <DigestLoading />, page: () => <DigestPage /> },
  search: { skeleton: () => <SearchLoading />, page: () => <AskView /> },
  welcome: { skeleton: () => <WelcomeLoading />, page: () => <WelcomePage /> },
  agent: { skeleton: () => <AgentLoading />, page: () => <AgentPage /> },
  capture: { skeleton: () => <CaptureLoading />, page: () => <CapturePage /> },
  "capture-connect": { skeleton: () => <ConnectLoading />, page: () => <ConnectPage /> },
  briefings: { skeleton: () => <BriefingsLoading />, page: () => <BriefingsPage /> },
  "briefings-detail": { skeleton: () => <BriefingLoading />, page: () => <BriefingPage /> },
};

export function HomePair({ id, mode, theme = "light" }: { id: string; mode: "skeleton" | "page"; theme?: Theme }) {
  const e = ENTRIES[id];
  return <Shell theme={theme}>{mode === "skeleton" ? e.skeleton() : e.page()}</Shell>;
}

