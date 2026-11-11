import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ChartBar, PlugsConnected, UsersThree, type Icon } from "@phosphor-icons/react";
import { Shell, type Theme } from "./Shell";
import { Card, CardHead, cardClass } from "../../../src/components/ui/Card";
import { TextLink } from "../../../src/components/ui/TextLink";
import { StatCard } from "../../../src/components/admin/StatCard";
import { WorkspaceInvite } from "../../../src/components/admin/WorkspaceInvite";
import { OrgNameCard } from "../../../src/components/tenant/OrgNameCard";
import { ReadinessStrip } from "../../../src/components/org-brain/ReadinessMeter";
import type { Readiness } from "../../../src/lib/api/org-brain-types";
import { Avatar } from "../../../src/components/ui/Avatar";
import { Button } from "../../../src/components/ui/Button";
import { Chip } from "../../../src/components/ui/Chip";
import { EmptyState } from "../../../src/components/ui/EmptyState";
import { Note } from "../../../src/components/ui/Note";
import { SectionCard, CardFoot } from "../../../src/components/ui/Card";
import { FieldRow, InlineRow, TextInput } from "../../../src/components/ui/Form";
import { Toggle } from "../../../src/components/settings/Toggle";
import { theadRowClass, thClass } from "../../../src/components/admin/StatCard";
import { MeterBar, UsageMeter } from "../../../src/components/tenant/UsageMeter";
import { AgentCollaborationControl } from "../../../src/components/tenant/AgentCollaborationControl";
import { ErasureFlow } from "../../../src/components/tenant/ErasureFlow";
import { ReadinessMeter } from "../../../src/components/org-brain/ReadinessMeter";
import { BrainSectionHead } from "../../../src/components/org-brain/parts";
import { AboutEditor } from "../../../src/components/org-brain/AboutEditor";
import { VocabularyEditor } from "../../../src/components/org-brain/VocabularyEditor";
import { OwnersEditor } from "../../../src/components/org-brain/OwnersEditor";
import { GoalsEditor } from "../../../src/components/org-brain/GoalsEditor";
import { MeetingTypesEditor } from "../../../src/components/org-brain/MeetingTypesEditor";
import { GroundRulesEditor } from "../../../src/components/org-brain/GroundRulesEditor";
import type { GlossaryTerm, MeetingTemplate, OrgGoal, OrgProfile, TopicOwner } from "../../../src/lib/api/org-brain-types";
import BrainLoading from "../../../src/app/(app)/workspace/brain/loading";
import BrainAboutLoading from "../../../src/app/(app)/workspace/brain/about/loading";
import BrainVocabularyLoading from "../../../src/app/(app)/workspace/brain/vocabulary/loading";
import BrainOwnersLoading from "../../../src/app/(app)/workspace/brain/owners/loading";
import BrainGoalsLoading from "../../../src/app/(app)/workspace/brain/goals/loading";
import BrainMeetingTypesLoading from "../../../src/app/(app)/workspace/brain/meeting-types/loading";
import BrainGroundRulesLoading from "../../../src/app/(app)/workspace/brain/ground-rules/loading";
import { Page, PageHead, SectionBar } from "../../../src/components/ui/Page";
import { OpsTabs } from "../../../src/components/ops/OpsTabs";
import { TenantDirectory } from "../../../src/components/ops/TenantDirectory";
import { AuditLogViewer } from "../../../src/components/ops/AuditLogViewer";
import { FlagControls } from "../../../src/components/ops/FlagRow";
import type { OpsTenant } from "../../../src/lib/ops";
import type { UserProfile } from "../../../src/lib/api/profile-types";
import AdminLoading from "../../../src/app/(admin)/loading";
import OpsLoading from "../../../src/app/(admin)/ops/loading";
import OpsAuditLoading from "../../../src/app/(admin)/ops/audit/loading";
import OpsCostsLoading from "../../../src/app/(admin)/ops/costs/loading";
import OpsFlagsLoading from "../../../src/app/(admin)/ops/flags/loading";
import { AboutYouStep } from "../../../src/components/onboarding/AboutYouStep";
import { MeetAgentStep } from "../../../src/components/onboarding/MeetAgentStep";
import OnboardingProfileLoading from "../../../src/app/(auth)/onboarding/profile/loading";
import OnboardingAgentLoading from "../../../src/app/(auth)/onboarding/agent/loading";
import { SetupFlow } from "../../../src/components/org-brain/SetupFlow";
import OnboardingWorkspaceLoading from "../../../src/app/(auth)/onboarding/workspace/loading";
import CallLoading from "../../../src/app/(call)/loading";
import WorkspaceLoading from "../../../src/app/(app)/workspace/loading";
import MembersLoading from "../../../src/app/(app)/workspace/members/loading";
import BillingLoading from "../../../src/app/(app)/workspace/billing/loading";
import AgentsLoading from "../../../src/app/(app)/workspace/agents/loading";
import DataLoading from "../../../src/app/(app)/workspace/data/loading";
import SupportLoading from "../../../src/app/(app)/workspace/support/loading";

/* Skeleton and page pairs, admin group: each route's loading.tsx (`skeleton`) against the page as
   it looks loaded (`page`). The Workspace and ops pages are async server components that read the
   gateway, so `page` is the page's own JSX frame (copied from page.tsx) around its real client and
   presentational components with sample data; the company brain editors, the tenant directory,
   the audit log and the onboarding steps are the real components. */

const READINESS: Readiness = {
  score: 60,
  checks: [
    { key: "about", label: "About the company", done: true, detail: "Written" },
    { key: "vocabulary", label: "Vocabulary", done: true, detail: "12 terms" },
    { key: "owners", label: "Who owns what", done: true, detail: "4 topics" },
    { key: "goals", label: "Goals", done: false, detail: "No active goal" },
    { key: "rules", label: "Ground rules", done: false, detail: "None set" },
  ],
};

function QuickLink({ href, icon: I, title, children }: { href: string; icon: Icon; title: string; children: ReactNode }) {
  return (
    <Link href={href} className={cardClass({ className: "group flex items-start gap-4" })}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-ctl bg-bg-2 text-ink-2" aria-hidden="true">
        <I size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-[14px] leading-relaxed text-ink-3">{children}</span>
      </span>
      <ArrowRight size={16} className="mt-1 shrink-0 text-ink-3" aria-hidden />
    </Link>
  );
}

function WorkspaceOverview() {
  return (
    <div className="flex flex-col gap-5">
      <SectionBar title="Overview" context="The workspace at a glance, and where to change each part of it." action={<WorkspaceInvite />} />
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active members" value={9} hint="Signed in at least once" />
        <StatCard label="Pending invites" value={2} hint="Waiting to accept" />
        <StatCard label="Plan" value="Team" hint="From billing" />
        <StatCard label="Integrations" value={3} hint="Connected" />
      </div>
      <Card as="section" flush aria-labelledby="brain-heading">
        <CardHead
          id="brain-heading"
          title="Company brain"
          description="What every agent knows about the company: what it does, its words, who owns what, its goals and what is off limits."
          right={<TextLink href="/workspace/brain">Open the company brain</TextLink>}
        />
        <div className="px-4 pb-[18px] sm:px-[22px]">
          <ReadinessStrip readiness={READINESS} />
        </div>
      </Card>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <OrgNameCard />
        <div className="grid gap-4">
          <QuickLink href="/workspace/members" icon={UsersThree} title="Members">
            9 people. Change access or remove it.
          </QuickLink>
          <QuickLink href="/workspace/billing" icon={ChartBar} title="Team plan">
            $12 per seat on the price list. Payments are not connected yet.
          </QuickLink>
          <QuickLink href="/settings/integrations" icon={PlugsConnected} title="Integrations">
            3 connected. Manage Calendar, Slack and Jira.
          </QuickLink>
        </div>
      </div>
    </div>
  );
}


const PEOPLE = [
  { id: "u-maya", name: "Maya Chen", email: "maya@example.com", tier: "owner" },
  { id: "u-raj", name: "Raj Patel", email: "raj@example.com", tier: "admin" },
  { id: "u-priya", name: "Priya Nair", email: "priya@example.com", tier: "member" },
  { id: "u-diego", name: "Diego Alvarez", email: "diego@example.com", tier: "member" },
  { id: "u-aiko", name: "Aiko Tanaka", email: "aiko@example.com", tier: "member" },
];
const MEMBER_OPTIONS = PEOPLE.map((p) => ({ id: p.id, name: p.name, email: p.email, imageUrl: null, isYou: p.id === "u-maya" }));

function Table({ caption, head, children }: { caption: string; head: string[]; children: ReactNode }) {
  return (
    <table className="mx-table w-full border-collapse text-left text-[14px]">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className={theadRowClass}>
          {head.map((h, i) => (
            <th key={h} scope="col" className={`${thClass} ${i === 0 ? "!pl-[22px]" : ""} ${i === head.length - 1 ? "!pr-[22px]" : ""}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-line">{children}</tbody>
    </table>
  );
}

function WorkspaceMembers() {
  return (
    <div className="flex flex-col gap-5">
      <SectionBar
        title="Members"
        context="Owners manage everything, admins manage people and settings, members use the workspace. Every change is written to the audit log."
        action={<WorkspaceInvite />}
      />
      <Card as="section" flush aria-label="Members">
        <Table caption="Members" head={["Person", "Access", "Since", "Remove"]}>
          {PEOPLE.map((m) => (
            <tr key={m.id}>
              <th scope="row" className="max-w-[360px] py-3 pl-[22px] pr-5 text-left font-normal">
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar name={m.name} id={m.email} size="md" />
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-semibold text-ink">{m.name}</span>
                    </span>
                    <span className="block truncate text-[14px] text-ink-3">{m.email}</span>
                  </span>
                </span>
              </th>
              <td data-label="Access" className="px-5 py-3">
                <Chip className="capitalize">{m.tier}</Chip>
              </td>
              <td data-label="Since" className="whitespace-nowrap px-5 py-3 text-[14px] tabular-nums text-ink-3">
                Mar 4, 2026
              </td>
              <td className="py-3 pl-5 pr-[22px] text-right">
                <Button variant="outline" size="sm">Remove access</Button>
              </td>
            </tr>
          ))}
        </Table>
      </Card>
      <Note>
        You cannot change or remove your own access here. Ask another owner, so the workspace always keeps someone who can manage it.
      </Note>
    </div>
  );
}

const TIERS = [
  { tier: "Fast", tokens: 812_000, purpose: "Live notes and captions clean-up." },
  { tier: "Standard", tokens: 344_000, purpose: "Summaries, decisions and briefs." },
  { tier: "Deep", tokens: 61_000, purpose: "Catch-ups and the company brain." },
];

function WorkspaceBilling() {
  return (
    <div className="flex flex-col gap-5">
      <SectionBar title="Usage and billing" context="This billing period, 1 to 30 November. Live captions and transcription keep running even if the agent budget runs out." />
      <Card as="section" aria-labelledby="plan-heading">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="min-w-0">
            <Chip tone="solid">Current plan</Chip>
            <h2 id="plan-heading" className="display mt-3 text-[30px] text-ink-display">Team</h2>
            <p className="mt-1 text-[15px] text-ink-2">
              <span className="display text-[22px] text-ink">$12</span> per seat per month on the price list
            </p>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-ink-2 md:flex-col md:items-start">
            <li>9 members in this workspace</li>
            <li>6,000 meeting minutes included</li>
            <li>2,000,000 agent tokens included per month</li>
          </ul>
        </div>
      </Card>
      <Card as="section" flush aria-labelledby="budget-heading">
        <CardHead id="budget-heading" title="Agent token budget" description="Checked before every model call, and moves with each one." right={<Chip tone="ok">Within budget</Chip>} />
        <div className="px-4 pb-5 pt-1 sm:px-[22px]">
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="display text-[44px] leading-none tabular-nums text-ink-display">1.2M</span>
            <span className="text-[15px] text-ink-2">of 2M tokens, <span className="font-semibold text-ink">60.9%</span></span>
          </p>
          <div className="mt-4">
            <MeterBar label="Agent tokens" used={1_217_000} included={2_000_000} />
          </div>
          <p className="mt-1 text-[14px] text-ink-3">783K tokens left this period</p>
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <SectionCard title="Everything else this period" headingLevel={2} headingId="dims-heading" description="What the workspace has used, next to what the plan includes.">
          <UsageMeter label="Meeting minutes" unit="minutes" used={2_140} included={6_000} />
          <UsageMeter label="Seats" unit="seats" used={9} included={10} />
          <UsageMeter label="Storage" unit="GB" used={12} included={50} />
        </SectionCard>
        <SectionCard title="Agent tokens by model" headingLevel={2} headingId="tiers-heading" description="1.2M tokens this period, as of the last nightly rollup.">
          {TIERS.map((t) => (
            <div key={t.tier} className="px-4 py-4 sm:px-[22px]">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="min-w-0 text-[15px] font-semibold text-ink">{t.tier}</p>
                <p className="shrink-0 text-[14px] tabular-nums text-ink-2">{t.tokens}</p>
              </div>
              <div className="h-2 rounded-full bg-bg-2" />
              <p className="mt-1.5 text-[14px] text-ink-3">{t.purpose}</p>
            </div>
          ))}
        </SectionCard>
      </div>
      <SectionCard title="Invoices" headingId="invoices-heading" description="Payments are not connected yet. This workspace has not been charged, and nothing here bills you.">
        <EmptyState inCard art="billing" title="No invoices yet" description="Checkout, invoices and seat billing arrive with the payments release." />
        <div className="flex items-center gap-2 px-4 py-3.5 text-[14px] text-ink-3 sm:px-[22px]">No next charge is scheduled.</div>
      </SectionCard>
    </div>
  );
}

function WorkspaceAgents() {
  const rows = [
    ["Members", "Context", "Same team", "Allow"],
    ["Members", "Decisions", "Same team", "Allow"],
    ["Admins", "Context", "Department", "Allow"],
    ["Guests", "Anything", "Workspace", "Deny"],
  ];
  return (
    <div className="flex flex-col gap-5">
      <SectionBar
        title="Agent collaboration"
        context="During a meeting, an agent can ask a teammate's agent for context its person is missing. Choose how far that reaches. Every request, allowed or refused, shows in the audit log."
      />
      <SectionCard title="Who agents may ask" headingLevel={2} headingId="level-heading" description="Applies to everyone in the workspace, whatever their role.">
        <AgentCollaborationControl current="same_team" />
      </SectionCard>
      <SectionCard title="Current grants" headingLevel={2} headingId="grants-heading" description="The rules behind the setting above. No rule means no access, and a deny rule always wins.">
        <div>
          <Table caption="Grants" head={["Who asks", "For", "Reaching", "Rule", "Since"]}>
            {rows.map((r, i) => (
              <tr key={i}>
                <th scope="row" className="py-3 pl-[22px] pr-5 text-left font-semibold text-ink">{r[0]}</th>
                <td data-label="For" className="px-5 py-3 text-ink-2">{r[1]}</td>
                <td data-label="Reaching" className="px-5 py-3 text-ink-2">{r[2]}</td>
                <td data-label="Rule" className="px-5 py-3"><Chip tone={r[3] === "Deny" ? "high" : "ok"}>{r[3]}</Chip></td>
                <td data-label="Since" className="whitespace-nowrap py-3 pl-5 pr-[22px] tabular-nums text-ink-3">Mar 4, 2026</td>
              </tr>
            ))}
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}

function WorkspaceData() {
  return (
    <div className="flex flex-col gap-5">
      <SectionBar
        title="Data and privacy"
        context="How long the workspace keeps what is said, what is redacted, how sure agents must be, and the requests that act on all of it. Every change is written to the audit log."
      />
      <form className="flex flex-col gap-6">
        <SectionCard title="Retention" headingLevel={2} headingId="retention-heading" description="How long transcripts and notes are kept before they are deleted for good. Blank keeps them until someone deletes them.">
          <FieldRow label="Transcripts" help="Days, 7 to 3650." htmlFor="rt">
            <TextInput id="rt" defaultValue="365" />
          </FieldRow>
          <FieldRow label="Notes" help="Agent notes kept in the background log. Days, 7 to 3650." htmlFor="rn">
            <TextInput id="rn" defaultValue="90" />
          </FieldRow>
        </SectionCard>
        <SectionCard title="Privacy" headingLevel={2} headingId="privacy-heading">
          <InlineRow label="Redact personal data" labelId="pii-label" help="Phone numbers, emails and similar details are removed from transcripts and documents before they are stored or shared with agents.">
            <Toggle checked onChange={() => undefined} labelledBy="pii-label" />
          </InlineRow>
        </SectionCard>
        <SectionCard title="Agent confidence" headingLevel={2} headingId="confidence-heading" description="Above the show threshold an agent's suggestion appears in the meeting; between the two it is only logged; below the log threshold it is dropped. Defaults are 0.7 and 0.4.">
          <div>
            <Table caption="Confidence thresholds" head={["Agent", "Show above", "Log from"]}>
              {["Decisions", "Action items", "Suggested questions", "Context fills"].map((a) => (
                <tr key={a}>
                  <th scope="row" className="py-3 pl-[22px] pr-5 text-left font-semibold text-ink">{a}</th>
                  <td data-label="Show above" className="px-5 py-3"><TextInput aria-label={`${a} show above`} className="max-w-[120px]" defaultValue="" /></td>
                  <td data-label="Log from" className="py-3 pl-5 pr-[22px]"><TextInput aria-label={`${a} log from`} className="max-w-[120px]" defaultValue="" /></td>
                </tr>
              ))}
            </Table>
          </div>
        </SectionCard>
        <div className={cardClass({ className: "flex flex-wrap items-center gap-x-4 gap-y-2 !py-3.5" })}>
          <Button type="button">Save settings</Button>
        </div>
      </form>
      <SectionCard title="Export workspace data" headingId="request-heading" description="An archive of the workspace's meetings, transcripts, confirmed decisions and action items.">
        <InlineRow label="Export workspace data" help="The archive is prepared in the background and expires after seven days.">
          <Button type="button">Request export</Button>
        </InlineRow>
      </SectionCard>
      <SectionCard title="Export requests" headingId="exports-heading" description="Newest first. A download link appears once an archive is ready.">
        <div>
          <Table caption="Export requests" head={["Requested", "Status", "Download"]}>
            {["Nov 2, 2026", "Oct 3, 2026"].map((d) => (
              <tr key={d}>
                <td data-label="Requested" className="whitespace-nowrap py-3 pl-[22px] pr-5 tabular-nums text-ink-2">{d}</td>
                <td data-label="Status" className="px-5 py-3"><Chip tone="ok">Ready</Chip></td>
                <td className="py-3 pl-5 pr-[22px] text-right"><Button variant="outline" size="sm">Download</Button></td>
              </tr>
            ))}
          </Table>
        </div>
      </SectionCard>
      <SectionCard title="Erase data" headingId="erase-heading" description="Erase everything the workspace holds about one person, or everything said in one meeting. Each request is written to the audit log.">
        <InlineRow label="Erase a person's or a meeting's data" help="Confirmed decisions and tasks stay as the workspace's record, with the person's name removed. This cannot be undone.">
          <ErasureFlow members={MEMBER_OPTIONS} meetings={[{ id: "m-1", title: "Weekly sync", when: "Nov 10", live: false }]} />
        </InlineRow>
        <EmptyState inCard compact art="done" title="No erasures yet" description="Erasures are listed here, newest first, with what was removed and each store's progress." />
      </SectionCard>
    </div>
  );
}

function WorkspaceSupport() {
  return (
    <div className="flex flex-col gap-5">
      <SectionBar title="Support access" context="Mytheus staff cannot see your workspace unless you let them. Access is for one person, for a fixed time, and you can end it early." />
      <SectionCard title="Grant access" headingLevel={2} headingId="grant-heading" description="Use the staff ID from your support conversation. Nobody else can use the grant.">
        <form className="flex flex-col divide-y divide-line">
          <FieldRow label="Staff ID" htmlFor="staff" help="The ID support gave you, pasted exactly.">
            <TextInput id="staff" placeholder="00000000-0000-0000-0000-000000000000" className="font-mono" />
          </FieldRow>
          <FieldRow label="What support may do" htmlFor="scope" help="Read only: see settings and logs. Admin: also change settings.">
            <TextInput id="scope" defaultValue="Read only" />
          </FieldRow>
          <FieldRow label="Ends after" htmlFor="hours" help="Access ends on its own. You can revoke it sooner.">
            <TextInput id="hours" defaultValue="24 hours" />
          </FieldRow>
          <CardFoot className="!border-t-0">
            <Button type="button">Grant access</Button>
          </CardFoot>
        </form>
      </SectionCard>
      <SectionCard title="Grants" headingLevel={2} headingId="grants-heading" description="Current and past grants for this workspace.">
        <div>
          <Table caption="Grants" head={["Staff ID", "Access", "Granted by", "Ends", "Status", "Revoke"]}>
            {["Active", "Ended", "Ended"].map((st, i) => (
              <tr key={i}>
                <th scope="row" className="max-w-[200px] truncate py-3 pl-[22px] pr-5 text-left text-[14px] font-normal text-ink">3f2a9c1e-77b0-4d1a</th>
                <td data-label="Access" className="px-5 py-3 text-ink-2">Read only</td>
                <td data-label="Granted by" className="px-5 py-3 text-ink-2">Maya Chen</td>
                <td data-label="Ends" className="whitespace-nowrap px-5 py-3 tabular-nums text-ink-3">Nov 12, 09:30</td>
                <td data-label="Status" className="px-5 py-3"><Chip tone={st === "Active" ? "ok" : "neutral"}>{st}</Chip></td>
                <td className="py-3 pl-5 pr-[22px] text-right">{st === "Active" ? <Button variant="outline" size="sm">Revoke</Button> : null}</td>
              </tr>
            ))}
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}

const T = "2026-10-01T10:00:00.000Z";
const PROFILE: OrgProfile = {
  description: "Acme makes meeting software for product teams. Customers are mid-size software companies that run many cross-team meetings and want decisions to stick.",
  industry: "B2B software",
  products: ["Acme Meet", "Acme Notes"],
  customers: ["Northwind", "Globex"],
  updated_by: "u-maya",
  updated_at: T,
};
const TERMS: GlossaryTerm[] = [
  ["Orbit", "product", "Our meeting assistant, shipped in March.", ["orbit app"]],
  ["Northwind", "customer", "Largest customer, on the enterprise plan.", []],
  ["GA", "acronym", "General availability.", []],
  ["Kestrel", "codename", "The mobile rewrite.", ["kestrel v2"]],
  ["MRR", "acronym", "Monthly recurring revenue.", []],
].map(([term, kind, definition, aliases], i) => ({ id: `t-${i}`, term, kind, definition, aliases, created_at: T, updated_at: T }) as unknown as GlossaryTerm);
const OWNERS: TopicOwner[] = [
  ["Pricing", "u-raj"],
  ["Hiring", "u-maya"],
  ["Mobile app", "u-diego"],
  ["Security reviews", "u-priya"],
].map(([topic, owner_user_id], i) => ({ id: `o-${i}`, topic, owner_user_id, created_at: T }));
const GOALS: OrgGoal[] = [
  "Ship the beta to ten design partners",
  "Cut onboarding time to one day",
  "Close two enterprise pilots",
].map((title, i) => ({ id: `g-${i}`, title, description: i === 0 ? "Beta by 2 December, with weekly feedback calls." : null, period: "2026-Q4", status: "active", owner_user_id: MEMBER_OPTIONS[i].id, position: i, created_at: T, updated_at: T }) as OrgGoal);
const TEMPLATES: MeetingTemplate[] = [
  ["Weekly sync", 30],
  ["Customer call", 45],
  ["Sprint planning", 60],
].map(([name, d], i) => ({ id: `mt-${i}`, name: name as string, description: "The team's standing meeting.", default_duration_minutes: d as number, agenda: [{ title: "Updates", duration_minutes: 10 }, { title: "Decisions", duration_minutes: 15 }], confidential: i === 1, created_by: "u-maya", created_at: T, updated_at: T }));
const RULES = ["Salaries", "Layoffs", "Health"];

function Tile({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
  return (
    <Link href="/workspace/brain" className={cardClass({ className: "group flex min-h-[188px] flex-col" })}>
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-[17px] font-semibold text-ink">{title}</span>
        {meta ? <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-ink-3">{meta}</span> : null}
      </span>
      <span className="mt-3 block min-w-0 flex-1 text-[14px] leading-relaxed text-ink-2">{children}</span>
      <span className="mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink">
        Open
        <ArrowRight size={14} aria-hidden />
      </span>
    </Link>
  );
}

function BrainOverview() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="sr-only">Overview</h2>
      <ReadinessMeter readiness={READINESS} headingLevel={3} />
      <section aria-labelledby="sections-h">
        <h3 id="sections-h" className="sr-only">Sections</h3>
        <div className="grid gap-4 md:grid-cols-2 min-[1700px]:grid-cols-3">
          <Tile title="About" meta="B2B software"><span className="line-clamp-4">{PROFILE.description}</span></Tile>
          <Tile title="Vocabulary" meta="5 terms">
            <span className="flex flex-wrap gap-1.5">{TERMS.map((t) => <Chip key={t.id}>{t.term}</Chip>)}</span>
          </Tile>
          <Tile title="Who owns what" meta="4 topics">
            <span className="grid gap-1.5">
              {OWNERS.map((o) => (
                <span key={o.id} className="flex min-w-0 items-center gap-2">
                  <Avatar name={o.topic} id={o.owner_user_id} size="xs" />
                  <span className="min-w-0 truncate"><span className="font-semibold text-ink">{o.topic}</span></span>
                </span>
              ))}
            </span>
          </Tile>
          <Tile title="Goals" meta="3 active">
            <span className="grid gap-1.5">
              {GOALS.map((g, i) => (
                <span key={g.id} className="flex min-w-0 items-baseline gap-2.5">
                  <span className="display w-4 shrink-0 text-right text-[17px] tabular-nums text-signal-ink">{i + 1}</span>
                  <span className="line-clamp-2 min-w-0">{g.title}</span>
                </span>
              ))}
            </span>
          </Tile>
          <Tile title="Meeting types" meta="3 types">
            <span className="grid gap-1">{TEMPLATES.map((t) => <span key={t.id} className="truncate font-medium text-ink">{t.name}</span>)}</span>
          </Tile>
          <Tile title="Ground rules" meta="3 topics">
            <span className="flex flex-wrap gap-1.5">{RULES.map((r) => <Chip key={r} tone="outline">{r}</Chip>)}</span>
          </Tile>
        </div>
      </section>
    </div>
  );
}

function BrainSection({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <BrainSectionHead title={title} lead={lead} />
      {children}
    </section>
  );
}

const TENANTS: OpsTenant[] = ["Acme", "Northwind", "Globex", "Initech", "Umbrella"].map((name, i) => ({
  org_id: `org_${i}a7f3c2e1`,
  name,
  plan: i % 2 ? "team" : "business",
  status: i === 3 ? "suspended" : "active",
  member_count: 4 + i * 3,
  created_at: "2026-03-04T10:00:00.000Z",
}));

/** The admin layout's <main>: no sidebar, its own gutters. */
function AdminMain({ children }: { children: ReactNode }) {
  return <div className="px-4 py-7 sm:px-6 lg:px-8 lg:py-10">{children}</div>;
}

function OpsTenants() {
  return (
    <div className="flex flex-col gap-5">
      <SectionBar title="Tenants" context="Every workspace on the platform. Opening this list is recorded in the ops audit log." />
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Tenants" value={5} hint="Every workspace on the platform" />
        <StatCard label="Suspended" value={1} hint="Members have no access" />
        <StatCard label="Members" value={40} hint="Across every tenant" />
      </div>
      <TenantDirectory tenants={TENANTS} />
    </div>
  );
}

function OpsFrame({ children }: { children: ReactNode }) {
  return (
    <Page>
      <PageHead title="Ops console" context="Every workspace on the platform: tenants, feature flags, cost and lag, and the audit log." />
      <OpsTabs />
      {children}
    </Page>
  );
}

function OpsAudit() {
  return (
    <div className="flex flex-col gap-5">
      <SectionBar title="Audit log" context="Who did what in one tenant. Read only, and every search here is recorded in the ops audit log." />
      <AuditLogViewer tenants={TENANTS.map((t) => ({ org_id: t.org_id, name: t.name }))} />
    </div>
  );
}

function OpsCosts() {
  return (
    <div className="flex flex-col gap-5">
      <SectionBar title="Cost and lag" context="Agent token use by tenant for November 2026, and pipeline health. Aggregates only." />
      <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Agent tokens this period" value="4.1M" hint="4,102,331 in all" />
        <StatCard label="Tenants past 80%" value={1} hint="Near their quota" />
        <StatCard label="Dead letters" value={0} hint="Nothing set aside" />
      </div>
      <SectionCard title="Agent tokens by tenant" headingLevel={2} headingId="tokens-heading" description="Highest share of quota first. Ticks mark 80% and 95%.">
        {TENANTS.slice(0, 4).map((t) => (
          <div key={t.org_id} className="px-4 py-4 sm:px-[22px]">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="min-w-0 truncate text-[15px] font-semibold text-ink">{t.name}</p>
              <p className="shrink-0 text-[14px] tabular-nums text-ink-2">1.2M of 2M <span className="ml-1.5 text-ink-3">60%</span></p>
            </div>
            <div className="relative h-2.5 rounded-full bg-bg-2" />
          </div>
        ))}
      </SectionCard>
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Dead-letter queues" headingLevel={2} headingId="dlq-heading" description="Messages that failed processing and were set aside.">
          <div>
            <Table caption="Dead letters" head={["Topic", "Messages"]}>
              {["transcript-chunks.dlq", "agent-results.dlq", "actions.dlq"].map((t) => (
                <tr key={t}>
                  <th scope="row" className="break-all py-3 pl-[22px] pr-5 text-left font-mono text-[14px] font-normal text-ink">{t}</th>
                  <td data-label="Messages" className="py-3 pl-5 pr-[22px] text-right tabular-nums text-ink-2">0</td>
                </tr>
              ))}
            </Table>
          </div>
        </SectionCard>
        <SectionCard title="Consumer lag" headingLevel={2} headingId="lag-heading" description="How far each consumer group is behind its topic.">
          <div>
            <Table caption="Consumer lag" head={["Group", "Topic", "Lag"]}>
              {["intelligence", "realtime", "search"].map((g) => (
                <tr key={g}>
                  <th scope="row" className="break-all py-3 pl-[22px] pr-5 text-left font-mono text-[14px] font-normal text-ink">{g}</th>
                  <td data-label="Topic" className="break-all px-5 py-3 font-mono text-[14px] text-ink-2">transcript-chunks</td>
                  <td data-label="Lag" className="py-3 pl-5 pr-[22px] text-right tabular-nums text-ink-2">12</td>
                </tr>
              ))}
            </Table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function OpsFlags() {
  const flags = [
    ["live_notes.v2", null, true],
    ["live_notes.v2", "Northwind", false],
    ["room.signals", null, true],
    ["briefings.audio", null, false],
  ] as const;
  return (
    <div className="flex flex-col gap-5">
      <SectionBar title="Feature flags" context="Turn features on for every tenant or for one. A tenant flag overrides the global one for that tenant." />
      <SectionCard
        title="Flags"
        headingLevel={2}
        headingId="flags-heading"
        description="A tenant row overrides the global row with the same key."
        aside={<span className="text-[14px] font-medium text-ink-3">4 in total</span>}
      >
        <div>
          <Table caption="Feature flags" head={["Key", "Applies to", "Updated", "Enabled"]}>
            {flags.map(([key, org, on], i) => (
              <tr key={i}>
                <th scope="row" className="py-3 pl-[22px] pr-5 text-left font-mono text-[14px] font-semibold text-ink">{key}</th>
                <td data-label="Applies to" className="px-5 py-3">{org ? <span className="text-ink-2">{org}</span> : <Chip>All tenants</Chip>}</td>
                <td data-label="Updated" className="whitespace-nowrap px-5 py-3 tabular-nums text-ink-3">Nov 3, 2026</td>
                <td className="py-3 pl-5 pr-[22px]"><FlagControls id={`f-${i}`} flagKey={key} enabled={on} /></td>
              </tr>
            ))}
          </Table>
        </div>
      </SectionCard>
      <SectionCard title="New flag" headingLevel={2} headingId="new-flag-heading" description="Create it off, check the scope, then turn it on from the list.">
        <form className="flex flex-col divide-y divide-line">
          <FieldRow label="Key" help="Lowercase letters, digits, dot, dash and underscore." htmlFor="flag-key">
            <TextInput id="flag-key" placeholder="live_notes.v2" />
          </FieldRow>
          <FieldRow label="Applies to" htmlFor="flag-org">
            <TextInput id="flag-org" defaultValue="All tenants" />
          </FieldRow>
          <FieldRow label="Start enabled" htmlFor="flag-enabled" help="Leave off to check the scope first.">
            <input id="flag-enabled" type="checkbox" className="h-5 w-5" />
          </FieldRow>
          <CardFoot className="!border-t-0">
            <Button type="button">Create flag</Button>
          </CardFoot>
        </form>
      </SectionCard>
    </div>
  );
}

const PROFILE_ME: UserProfile = {
  id: "u-maya",
  email: "maya@example.com",
  avatar_url: null,
  role: "Product manager",
  skills: ["Billing", "Pricing"],
  bio: "I run the billing team. This quarter we are moving invoices to the new payments API.",
  listen_for: ["Deadlines"],
  ignore_topics: [],
  agent_name: null,
  agent_avatar_seed: null,
  agent_personality: "balanced",
  agent_instructions: null,
  created_at: T,
  updated_at: T,
};

type Entry = { skeleton: () => ReactNode; page: () => ReactNode; meet?: boolean; bare?: boolean };

const ENTRIES: Record<string, Entry> = {
  workspace: { skeleton: () => <WorkspaceLoading />, page: () => <WorkspaceOverview /> },
  members: { skeleton: () => <MembersLoading />, page: () => <WorkspaceMembers /> },
  billing: { skeleton: () => <BillingLoading />, page: () => <WorkspaceBilling /> },
  agents: { skeleton: () => <AgentsLoading />, page: () => <WorkspaceAgents /> },
  data: { skeleton: () => <DataLoading />, page: () => <WorkspaceData /> },
  support: { skeleton: () => <SupportLoading />, page: () => <WorkspaceSupport /> },
  "admin-root": { bare: true, skeleton: () => <AdminMain><AdminLoading /></AdminMain>, page: () => <AdminMain><OpsFrame><OpsTenants /></OpsFrame></AdminMain> },
  ops: { bare: true, skeleton: () => <AdminMain><OpsLoading /></AdminMain>, page: () => <AdminMain><OpsTenants /></AdminMain> },
  "ops-audit": { bare: true, skeleton: () => <AdminMain><OpsAuditLoading /></AdminMain>, page: () => <AdminMain><OpsAudit /></AdminMain> },
  "ops-costs": { bare: true, skeleton: () => <AdminMain><OpsCostsLoading /></AdminMain>, page: () => <AdminMain><OpsCosts /></AdminMain> },
  "ops-flags": { bare: true, skeleton: () => <AdminMain><OpsFlagsLoading /></AdminMain>, page: () => <AdminMain><OpsFlags /></AdminMain> },
  "onboarding-profile": {
    bare: true,
    skeleton: () => <OnboardingProfileLoading />,
    page: () => <AboutYouStep initial={PROFILE_ME} email="maya@example.com" youSeed="maya" />,
  },
  "onboarding-agent": {
    bare: true,
    skeleton: () => <OnboardingAgentLoading />,
    page: () => <MeetAgentStep initial={null} defaultSeed="agent-maya" personName="Maya Chen" email="maya@example.com" nextHref="/dashboard" />,
  },
  "onboarding-workspace": {
    bare: true,
    skeleton: () => <OnboardingWorkspaceLoading />,
    page: () => (
      <SetupFlow
        orgName="Acme"
        email="maya@example.com"
        initialProfile={PROFILE}
        initialTerms={TERMS}
        initialOwners={OWNERS}
        initialGoals={GOALS}
        members={MEMBER_OPTIONS}
        defaultPeriod="2026-Q4"
      />
    ),
  },
  brain: { skeleton: () => <BrainLoading />, page: () => <BrainOverview /> },
  "brain-about": {
    skeleton: () => <BrainAboutLoading />,
    page: () => (
      <BrainSection title="About the company" lead="A few plain sentences on what the company does and for whom. Every agent reads this before it listens to a meeting.">
        <div>
          <AboutEditor initial={PROFILE} canEdit />
        </div>
      </BrainSection>
    ),
  },
  "brain-vocabulary": {
    skeleton: () => <BrainVocabularyLoading />,
    page: () => (
      <BrainSection title="Vocabulary" lead="The words an outsider would not know: product names, codenames, acronyms, customers. Agents understand them, and live captions learn to spell them.">
        <VocabularyEditor initial={TERMS} canEdit />
      </BrainSection>
    ),
  },
  "brain-owners": {
    skeleton: () => <BrainOwnersLoading />,
    page: () => (
      <BrainSection title="Who owns what" lead="A topic and the one person who owns it. Agents suggest them as the owner of a new action and as the person to ask.">
        <OwnersEditor initial={OWNERS} members={MEMBER_OPTIONS} canEdit />
      </BrainSection>
    ),
  },
  "brain-goals": {
    skeleton: () => <BrainGoalsLoading />,
    page: () => (
      <BrainSection title="Goals" lead="What matters now, most important first. Hosts tie agenda items to a goal, and agents weigh what they keep against these.">
        <GoalsEditor initial={GOALS} members={MEMBER_OPTIONS} canEdit defaultPeriod="2026-Q4" />
      </BrainSection>
    ),
  },
  "brain-meeting-types": {
    skeleton: () => <BrainMeetingTypesLoading />,
    page: () => (
      <BrainSection title="Meeting types" lead="The meetings the company runs often, with their usual length and agenda. A host picks one on New meeting and starts from it.">
        <MeetingTypesEditor initial={TEMPLATES} canEdit />
      </BrainSection>
    ),
  },
  "brain-ground-rules": {
    skeleton: () => <BrainGroundRulesLoading />,
    page: () => (
      <BrainSection title="Ground rules" lead="Topics agents must leave alone: no notes, no suggestions, no actions from a stretch of a meeting that is mainly about one of them.">
        <GroundRulesEditor initial={RULES} canEdit />
      </BrainSection>
    ),
  },
};

export function AdminPair({ id, mode, theme = "light" }: { id: string; mode: "skeleton" | "page"; theme?: Theme }) {
  const e = ENTRIES[id];
  return (
    <Shell theme={theme} meet={e.meet} bare={e.bare}>
      {mode === "skeleton" ? e.skeleton() : e.page()}
    </Shell>
  );
}

/** The call's loading frame, inside the call layout's `.mx-app.mx-meet` root. */
export function CallSkeleton({ theme = "light" }: { theme?: Theme }) {
  return (
    <Shell theme={theme} bare>
      <div className="mx-meet min-h-dvh bg-bg">
        <CallLoading />
      </div>
    </Shell>
  );
}
