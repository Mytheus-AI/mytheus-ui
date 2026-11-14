import type { ReactNode } from "react";
import { ArrowLeft, Bell, EnvelopeSimple, UserCircle } from "@phosphor-icons/react";
import { Shell, type Theme } from "./Shell";
import { NOW } from "./fixtures";
import { Page, PageHead, SectionBar, pageTitleClass } from "../../../src/components/ui/Page";
import { Card, CardHead, SectionCard } from "../../../src/components/ui/Card";
import { Chip } from "../../../src/components/ui/Chip";
import { Avatar } from "../../../src/components/ui/Avatar";
import { buttonClass, Button } from "../../../src/components/ui/Button";
import { FieldRow, InfoRow, InlineRow } from "../../../src/components/ui/Form";
import { Input } from "../../../src/components/ui/Input";
import { TextLink } from "../../../src/components/ui/TextLink";
import { NewDepartmentButton, NewTeamButton } from "../../../src/components/org/OrgAdmin";
import { PeopleBoard } from "../../../src/components/org/PeopleBoard";
import { CHART as PEOPLE_CHART, CONTEXT as PEOPLE_CONTEXT, MEMBER_OPTIONS, PICK_DEPARTMENTS } from "../people-fixture";
import { TasksView } from "../../../src/components/tasks/TasksView";
import { PromiseLedger } from "../../../src/components/promises/ledger/PromiseLedger";
import { StatusRequestsView } from "../../../src/components/status/StatusRequestsView";
import { SettleList } from "../../../src/components/settle/SettleList";
import { SettleThread } from "../../../src/components/settle/SettleThread";
import { NotificationPreferencesForm } from "../../../src/components/settings/NotificationPreferencesForm";
import { WeeklyDigestForm } from "../../../src/components/settings/WeeklyDigestForm";
import { ListeningSettings } from "../../../src/components/listening/ListeningSettings";
import { PositionsEditor } from "../../../src/components/listening/PositionsEditor";
import { MemoryPanel } from "../../../src/components/settings/MemoryPanel";
import { BriefingSettingsPanel } from "../../../src/components/briefing/BriefingSettingsPanel";
import { ApiTokensPanel } from "../../../src/components/settings/ApiTokensPanel";
import { ConnectedAppsPanel } from "../../../src/components/settings/ConnectedAppsPanel";
import { ConnectToolsPanel } from "../../../src/components/settings/ConnectToolsPanel";
import { AppearancePanel } from "../../../src/components/settings/AppearancePanel";
import { mergePreferences } from "../../../src/lib/notification-preferences";
import type { TaskItem } from "../../../src/lib/tasks";
import type { StatusRequestView } from "../../../src/lib/api/personal-types";
import type { ListeningPreferencesView, StandingPosition } from "../../../src/lib/api/listening-types";
import PeopleLoading from "../../../src/app/(app)/people/loading";
import PersonLoading from "../../../src/app/(app)/people/[personId]/loading";
import TasksLoading from "../../../src/app/(app)/work/tasks/loading";
import PromisesLoading from "../../../src/app/(app)/work/promises/loading";
import UpdatesLoading from "../../../src/app/(app)/work/updates/loading";
import SettleLoading from "../../../src/app/(app)/work/settle/loading";
import SettlementLoading from "../../../src/app/(app)/work/settle/[settlementId]/loading";
import ProfileLoading from "../../../src/app/(app)/settings/profile/loading";
import NotificationsLoading from "../../../src/app/(app)/settings/notifications/loading";
import ListeningLoading from "../../../src/app/(app)/settings/listening/loading";
import MemoryLoading from "../../../src/app/(app)/settings/memory/loading";
import BriefingsLoading from "../../../src/app/(app)/settings/briefings/loading";
import IntegrationsLoading from "../../../src/app/(app)/settings/integrations/loading";
import { IntegrationsPanel } from "../../../src/components/settings/IntegrationsPanel";
import { normalizeIntegrations } from "../../../src/lib/integrations";
import ApiLoading from "../../../src/app/(app)/settings/api/loading";
import AppearanceLoading from "../../../src/app/(app)/settings/appearance/loading";
import { CAPACITY, LEDGER, TODAY } from "../ledger-fixture";
import { SETTLEMENT, SETTLEMENT_RESOLVED, SETTLEMENT_SHARED } from "../why-blast-fixture";
import { MEMORY_FIXTURE } from "../memory-fixture";
import { SETTINGS as BRIEFING_SETTINGS } from "../briefing-fixture";

/* Skeleton and page pairs: People, My work and Settings. The My work and Settings layouts keep
   their title and tabs on screen while a tab loads, so a pair is the tab's body alone (Settings
   held to its 880px panel column), which is where a skeleton can jump. Where the page is an async
   server component (People, a person, Profile, the promise nudges card) the `page` side repeats the
   page's own JSX with the same kit and sample data; everything else is the real view component. */

const day = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const task = (id: string, title: string, due: number | null, over: Partial<TaskItem> = {}): TaskItem => ({
  id,
  meetingId: "m-1",
  meetingTitle: "Weekly sync",
  title,
  assignee: "Maya Chen",
  dueDate: due === null ? null : day(due),
  priority: null,
  status: "confirmed",
  ...over,
});
const TASKS: TaskItem[] = [
  task("t1", "Send Raj the pricing numbers", 0, { priority: "high" }),
  task("t2", "Draft the launch email", 0),
  task("t3", "Review Diego's onboarding plan", 3),
  task("t4", "Book the customer calls", 4, { assignee: "Priya Shah" }),
  task("t5", "Share the board notes", -3, { status: "done" }),
];

const update = (id: string, title: string): StatusRequestView => ({
  id,
  action_id: `a-${id}`,
  user_id: "u-maya",
  meeting_id: "m-1",
  state: "pending",
  status_text: null,
  requested_at: "2026-11-11T08:00:00Z",
  answered_at: null,
  actionTitle: title,
  meetingTitle: "Weekly sync",
  meetingStart: "2026-11-12T10:00:00Z",
});

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

/* ---- People (async server page): the page's own JSX, sample org ---- */
function PeoplePage() {
  return (
    <Page>
      <PageHead
        title="People"
        context={PEOPLE_CONTEXT}
        action={
          <>
            <NewDepartmentButton departments={PICK_DEPARTMENTS} />
            <NewTeamButton departments={PICK_DEPARTMENTS} people={[]} />
          </>
        }
      />
      <PeopleBoard chart={PEOPLE_CHART} departments={PICK_DEPARTMENTS} members={MEMBER_OPTIONS} canEdit />
    </Page>
  );
}

function PersonPage() {
  return (
    <Page>
      <a href="/people" className="inline-flex min-h-[40px] items-center gap-1.5 self-start rounded-ctl pr-2 text-[14px] font-semibold text-ink-3 sm:hidden">
        <ArrowLeft size={15} weight="bold" aria-hidden />
        People
      </a>
      <header className="flex flex-wrap items-center gap-x-6 gap-y-5 pb-7 pt-2">
        <Avatar name="Raj Patel" id="raj@example.com" size="xl" />
        <div className="min-w-0 flex-[1_1_280px]">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className={pageTitleClass}>Raj Patel</h1>
            <Chip>Team lead</Chip>
          </div>
          <p className="mt-1.5 text-[15px] text-ink-3">Engineering manager</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Chip>Engineering</Chip>
            <Chip tone="outline">Platform</Chip>
          </div>
        </div>
        <a href="mailto:raj@example.com" className={buttonClass({ className: "min-w-0 max-w-full" })}>
          <EnvelopeSimple size={17} aria-hidden className="shrink-0" />
          <span className="truncate">Email Maya</span>
        </a>
      </header>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card as="section" flush>
            <CardHead title="About" />
            <p className="max-w-[68ch] px-4 pb-[18px] text-[15px] leading-relaxed text-ink-2 sm:px-[22px]">Leads the platform team. Owns the release train and the on-call rota.</p>
          </Card>
          <Card as="section" flush>
            <CardHead title="Recent meetings" description="Meetings they took part in, newest first." />
            <ul className="divide-y divide-line border-t border-line">
              {["Weekly sync", "Pricing review", "Launch plan"].map((m) => (
                <li key={m}>
                  <div className="group flex min-h-[56px] items-center gap-3.5 px-4 py-3 sm:px-[22px]">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-ctl bg-bg-2 text-ink-2" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-ink">{m}</span>
                      <span className="block text-[12.5px] text-ink-3">Nov 10, 2026</span>
                    </span>
                    <Chip>Ended</Chip>
                    <span className="h-3.5 w-3.5 shrink-0" />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <Card as="section" flush>
            <CardHead title="Skills" />
            <div className="flex flex-wrap gap-2 px-4 pb-[18px] sm:px-[22px]">
              {["Go", "Kubernetes", "Hiring"].map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
            </div>
          </Card>
          <Card as="section" flush>
            <CardHead title="What their Myte listens for" description="Topics from the role taxonomy. Their Myte surfaces notes on these first." />
            <div className="flex flex-wrap gap-2 px-4 pb-[18px] sm:px-[22px]">
              {["Release dates", "Incidents"].map((t) => (
                <Chip key={t} tone="accent">
                  {t}
                </Chip>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}

/* ---- Settings: the panel column ---- */
function Panel({ children }: { children: ReactNode }) {
  return <div className="max-w-[880px]">{children}</div>;
}

function ProfilePage() {
  return (
    <>
      <SectionBar title="Profile" context="How you appear to teammates, and what your Myte knows about you." />
      <div className="grid gap-5">
        <SectionCard title="Your account" description="How you appear to teammates in meetings, transcripts and tasks.">
          <div className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-[22px] md:py-5">
            <Avatar name="Maya Chen" size="lg" />
            <div className="min-w-0 flex-[1_1_16rem]">
              <Input id="pf-name" label="Name" defaultValue="Maya Chen" />
            </div>
            <Button disabled>Save name</Button>
          </div>
        </SectionCard>
        <SectionCard title="Your doodle" description="The face teammates see next to your name.">
          <div className="px-4 py-5 sm:px-[22px]">
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <span key={i} className="aspect-square rounded-ctl bg-bg-2" />
              ))}
            </div>
          </div>
        </SectionCard>
        <SectionCard title="What your Myte knows about you" description="Your role and your work tune what your Myte captures. An engineer and a PM leave the same meeting with different notes.">
          <FieldRow label="Role" htmlFor="pf-role" help="As your team would say it.">
            <Input id="pf-role" label="Role" defaultValue="Product manager" />
          </FieldRow>
          <FieldRow label="What you work on" htmlFor="pf-work">
            <Input id="pf-work" label="What you work on" defaultValue="Pricing and onboarding" />
          </FieldRow>
          <FieldRow label="Topics" htmlFor="pf-topics">
            <Input id="pf-topics" label="Topics" defaultValue="Pricing" />
          </FieldRow>
          <FieldRow label="People you work with" htmlFor="pf-people">
            <Input id="pf-people" label="People" defaultValue="Raj Patel" />
          </FieldRow>
          <div className="flex justify-end px-4 py-4 sm:px-[22px]">
            <Button disabled>Save</Button>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

function NudgesCard() {
  return (
    <SectionCard title="Promise nudges" headingLevel={3} description="When a task you promised by a date is still open in Jira after it, your Myte nudges you before anyone else hears.">
      <div className="grid md:grid-cols-2 md:divide-x md:divide-line">
        <InfoRow icon={<Bell size={18} />} title="You first, privately">
          The day after the due date, if the linked Jira ticket is still open, only you get a note in your Inbox.
        </InfoRow>
        <InfoRow icon={<UserCircle size={18} />} title="The host, two days later">
          If the ticket is still open two days after that, the host of the meeting where you made the promise is told.
        </InfoRow>
      </div>
      <InlineRow label="Jira" help="Not connected, so no nudges are sent. Connect Jira and they start the next morning.">
        <TextLink href="/settings/integrations">Connect Jira</TextLink>
      </InlineRow>
    </SectionCard>
  );
}

/* Settings > Integrations, every tool configured and none connected (each card's action is Connect). */
const READY_LOAD = {
  kind: "live" as const,
  items: normalizeIntegrations(
    ["google_calendar", "slack", "jira", "linear", "hubspot", "notion", "confluence"].map((provider) => ({ provider, configured: provider !== "linear", status: null })),
  ),
};

type Entry = { skeleton: () => ReactNode; page: () => ReactNode };
const panel = (skeleton: () => ReactNode, page: () => ReactNode): Entry => ({ skeleton: () => <Panel>{skeleton()}</Panel>, page: () => <Panel>{page()}</Panel> });

const ENTRIES: Record<string, Entry> = {
  people: { skeleton: () => <PeopleLoading />, page: () => <PeoplePage /> },
  person: { skeleton: () => <PersonLoading />, page: () => <PersonPage /> },
  tasks: { skeleton: () => <TasksLoading />, page: () => <TasksView actions={TASKS} members={null} /> },
  promises: {
    skeleton: () => <PromisesLoading />,
    page: () => <PromiseLedger initial={LEDGER} initialCapacity={CAPACITY} incoming={[]} members={null} slack="connected" serverToday={TODAY} focus={{}} />,
  },
  updates: {
    skeleton: () => <UpdatesLoading />,
    page: () => <StatusRequestsView pending={[update("s1", "Ship the beta checklist"), update("s2", "Send the pricing deck")]} answered={[]} answeredFailed={false} nowIso={NOW} />,
  },
  settle: {
    skeleton: () => <SettleLoading />,
    page: () => (
      <div>
        <SectionBar context="When one of your decisions may clash with another team's, you settle it here with that decision's owner." />
        <SettleList items={[SETTLEMENT, SETTLEMENT_SHARED, SETTLEMENT_RESOLVED].map((s, i) => ({ ...s, id: `${s.id.slice(0, -1)}${i}` }))} />
      </div>
    ),
  },
  settlement: { skeleton: () => <SettlementLoading />, page: () => <SettleThread initial={SETTLEMENT} /> },
  "settings-profile": panel(() => <ProfileLoading />, () => <ProfilePage />),
  "settings-notifications": panel(
    () => <NotificationsLoading />,
    () => (
      <>
        <SectionBar title="Notifications" context="Which alerts from your Myte reach you, and where. Everything still lands in your Inbox." />
        <div className="grid gap-5">
          <NotificationPreferencesForm initial={mergePreferences([])} loaded email="connected" />
          <WeeklyDigestForm initial={{ weekly_enabled: true, email_enabled: false }} loaded emailConfigured />
          <NudgesCard />
        </div>
      </>
    ),
  ),
  "settings-listening": panel(
    () => <ListeningLoading />,
    () => (
      <>
        <SectionBar title="Listening" context="When your Myte may pull you out of what you are doing, and what it may say for you." action={<TextLink href="/meetings/listening">Choose which meetings</TextLink>} />
        <div className="grid gap-5">
          <ListeningSettings initial={PREFS} loaded />
          <PositionsEditor initial={POSITIONS} loaded />
        </div>
      </>
    ),
  ),
  "settings-memory": panel(
    () => <MemoryLoading />,
    () => (
      <>
        <SectionBar title="What your Myte remembers" context="What it learned from the notes and suggestions you keep or dismiss, and the questions you ask. Only you see this, and you can change any of it." />
        <MemoryPanel initial={MEMORY_FIXTURE} />
      </>
    ),
  ),
  "settings-briefings": panel(
    () => <BriefingsLoading />,
    () => (
      <>
        <SectionBar title="Briefings" context="When your Myte briefs you, how long, in which language and in what voice. Only you hear your briefings." />
        <BriefingSettingsPanel initial={BRIEFING_SETTINGS} />
      </>
    ),
  ),
  "settings-integrations": panel(
    () => <IntegrationsLoading />,
    () => (
      <>
        <SectionBar title="Integrations" context="The tools your Mytes work with, and where the workspace shares what it confirms." />
        <div className="grid gap-6">
          <IntegrationsPanel load={READY_LOAD} banner={null} people={new Map()} canManage appOrigin="https://dashboard.mytheus.cloud" apiOrigin="https://api.mytheus.cloud" />
        </div>
      </>
    ),
  ),
  "settings-api": panel(
    () => <ApiLoading />,
    () => (
      <>
        <SectionBar title="API access" context="Connect Claude and other tools to your meetings, with Mytheus sign-in or a personal access token. Only you see your tokens and apps." />
        <div className="grid gap-5">
          <ApiTokensPanel initial={[]} nowIso={NOW} />
          <ConnectedAppsPanel initial={[]} />
          <ConnectToolsPanel origin="https://api.example.com" />
        </div>
      </>
    ),
  ),
  "settings-appearance": panel(
    () => <AppearanceLoading />,
    () => (
      <>
        <SectionBar title="Appearance" context="How Mytheus looks and responds in this browser." />
        <AppearancePanel />
      </>
    ),
  ),
};

export function WorkPair({ id, mode, theme = "light" }: { id: string; mode: "skeleton" | "page"; theme?: Theme }) {
  const e = ENTRIES[id];
  return <Shell theme={theme}>{mode === "skeleton" ? e.skeleton() : e.page()}</Shell>;
}

