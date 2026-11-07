import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, EnvelopeSimple, Sparkle, UsersThree, VideoCamera } from "@phosphor-icons/react/dist/ssr";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Note, SectionCard } from "@/components/settings/primitives";
import { apiSafe } from "@/lib/api/client";
import type { components as BffSchemas } from "@/lib/api/generated/bff";
import { mockDepartments, mockMeetings, mockPeopleProfiles, personSlug } from "@/lib/mock/data";

export const metadata: Metadata = { title: "Person | Mytheus" };

/* Person profile (Plan 5-6 section 3.5, doc 20 section 7). A real `user_id` reads
   `GET /bff/people/{user_id}`, which is `get_user_context()` plus email. The org chart still
   runs on mock people addressed by a name slug, so those resolve to the sample profiles. */

type PersonProfile = BffSchemas["schemas"]["PersonProfile"];

type PersonView = {
  name: string;
  email: string;
  /** `users.avatar_url`: Clerk's picture, which is the rendered doodle once one is chosen */
  avatarUrl: string | null;
  role: string | null;
  bio: string | null;
  skills: string[];
  topics: string[];
  teams: string[];
  department: string | null;
  lead: boolean;
  meetings: { id: string; title: string; when: string | null; status: string }[];
  source: "live" | "sample";
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function fromApi(p: PersonProfile): PersonView {
  return {
    // The profile carries no display name; the email's local part is the honest stand-in.
    name: p.email
      .split("@")[0]
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    email: p.email,
    avatarUrl: p.avatar_url,
    role: p.role,
    bio: p.bio,
    skills: p.skills,
    topics: p.topics,
    teams: p.team.map((t) => t.name),
    department: p.department?.name ?? null,
    lead: false,
    meetings: p.recent_meetings.map((m) => ({
      id: m.id,
      title: m.title ?? "Untitled meeting",
      when: m.scheduled_start,
      status: m.status,
    })),
    source: "live",
  };
}

function fromMock(slug: string): PersonView | null {
  for (const dep of mockDepartments) {
    for (const team of dep.teams) {
      const member = team.members.find((m) => personSlug(m.name) === slug);
      if (!member) continue;
      const profile = mockPeopleProfiles.find((p) => p.name === member.name);
      const teams = mockDepartments.flatMap((d) =>
        d.teams.filter((t) => t.members.some((m) => m.name === member.name)).map((t) => t.name),
      );
      return {
        name: member.name,
        email: profile?.email ?? "",
        avatarUrl: null,
        role: member.role,
        bio: profile?.bio ?? null,
        skills: profile?.skills ?? [],
        topics: profile?.topics ?? [],
        teams,
        department: dep.name,
        lead: !!member.lead,
        meetings: mockMeetings
          .filter((m) => m.participants.includes(member.name))
          .map((m) => ({ id: m.id, title: m.title, when: m.startTime, status: m.status })),
        source: "sample",
      };
    }
  }
  return null;
}

export default async function PersonPage({ params }: { params: { personId: string } }) {
  let person: PersonView | null = null;

  if (UUID.test(params.personId)) {
    const res = await apiSafe<PersonProfile>(`/bff/people/${params.personId}`);
    if (res.ok) person = fromApi(res.data);
    else if (res.error.status === 404) notFound();
  } else {
    person = fromMock(params.personId);
  }
  if (!person) notFound();

  const meetings = [...person.meetings].sort((a, b) => (b.when ?? "").localeCompare(a.when ?? ""));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 motion-safe:animate-[fadeUp_0.15s_var(--ease-out)_both]">
      <Link
        href="/org"
        className="inline-flex items-center gap-1.5 self-start rounded-md text-[13px] font-semibold text-ink-3 transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} weight="bold" aria-hidden />
        Org chart
      </Link>

      <header className="relative overflow-hidden rounded-card border border-line bg-surface p-6 shadow-sm sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(closest-side,var(--signal-soft),transparent)]"
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar name={person.name} id={person.email || undefined} src={person.avatarUrl} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="display text-[clamp(1.9rem,3.4vw,2.6rem)] text-ink-display">{person.name}</h1>
              {person.lead ? <Badge>Team lead</Badge> : null}
            </div>
            <p className="mt-1 text-[15px] text-ink-2">{person.role ?? "No role set yet"}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
              {person.department ? (
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-bg-2 px-3 py-1 font-medium text-ink-2">
                  <UsersThree size={14} aria-hidden />
                  {person.department}
                </span>
              ) : null}
              {person.teams.map((t) => (
                <span key={t} className="rounded-pill border border-line px-3 py-1 font-medium text-ink-2">
                  {t}
                </span>
              ))}
            </div>
          </div>
          {person.email ? (
            <a
              href={`mailto:${person.email}`}
              className="inline-flex h-10 min-w-0 items-center gap-2 self-start rounded-pill border border-line bg-surface px-4 text-[13.5px] font-semibold text-ink-2 transition-colors hover:border-line-2 hover:text-ink focus-visible:!rounded-pill sm:self-center"
            >
              <EnvelopeSimple size={16} aria-hidden className="shrink-0" />
              <span className="truncate">{person.email}</span>
            </a>
          ) : null}
        </div>
      </header>

      {person.source === "sample" ? (
        <Note>Sample profile. Real profiles load from your organization once its directory is connected.</Note>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard title="About">
            <p className="px-4 py-4 text-[14.5px] leading-relaxed text-ink-2 sm:px-[22px]">{person.bio ?? "No bio yet."}</p>
          </SectionCard>

          <SectionCard title="Recent meetings" description="Meetings they took part in, newest first.">
            {meetings.length ? (
              meetings.map((m) => (
                <Link
                  key={m.id}
                  href={`/meetings/${m.id}`}
                  className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-bg sm:px-[22px]"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-bg-2 text-ink-2">
                    <VideoCamera size={17} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-ink">{m.title}</span>
                    <span className="block text-[12.5px] text-ink-3">
                      {m.when ? dateFormatter.format(new Date(m.when)) : "Not scheduled"}
                    </span>
                  </span>
                  <Badge tone={m.status === "live" ? "danger" : "default"} className="capitalize">
                    {m.status}
                  </Badge>
                  <ArrowRight
                    size={15}
                    className="shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              ))
            ) : (
              <p className="px-4 py-4 text-[14px] text-ink-3 sm:px-[22px]">No meetings yet.</p>
            )}
          </SectionCard>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <SectionCard title="Skills">
            <div className="flex flex-wrap gap-2 px-4 py-4 sm:px-[22px]">
              {person.skills.length ? (
                person.skills.map((s) => (
                  <span key={s} className="rounded-pill bg-bg-2 px-3 py-1.5 text-[13px] font-medium text-ink-2">
                    {s}
                  </span>
                ))
              ) : (
                <p className="text-[14px] text-ink-3">No skills listed.</p>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="What their agent listens for"
            description="Topics from the role taxonomy. Their agent surfaces notes on these first."
          >
            <div className="flex flex-wrap gap-2 px-4 py-4 sm:px-[22px]">
              {person.topics.length ? (
                person.topics.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-pill bg-signal-soft px-3 py-1.5 text-[13px] font-medium text-signal-deep"
                  >
                    <Sparkle size={12} weight="fill" aria-hidden />
                    {t}
                  </span>
                ))
              ) : (
                <p className="text-[14px] text-ink-3">No topics yet.</p>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
