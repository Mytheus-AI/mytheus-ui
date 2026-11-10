import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CaretRight, EnvelopeSimple, Sparkle, UsersThree, VideoCamera } from "@phosphor-icons/react/dist/ssr";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiSafe } from "@/lib/api/client";
import type { components as BffSchemas } from "@/lib/api/generated/bff";
import { listMembers } from "@/lib/api/members";

export const metadata: Metadata = { title: "Person | Mytheus" };

/* Person profile (Plan 5-6 section 3.5, doc 20 section 7). Addressed by internal `user_id`,
   which is what the org chart links to. Reads `GET /bff/people/{user_id}`, which is
   `get_user_context()` plus email; the display name and photo come from Clerk via
   `listMembers()`, because the profile carries no name. */

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
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function fromApi(p: PersonProfile, named?: { name: string; imageUrl: string | null }): PersonView {
  return {
    // The profile carries no display name; the email's local part is the honest stand-in.
    name:
      named?.name ||
      p.email
        .split("@")[0]
        .replace(/[._-]+/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
    email: p.email,
    avatarUrl: named?.imageUrl ?? p.avatar_url,
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
  };
}


/* Meeting states as chips in the frozen language: live acts now (red), scheduled informs (blue). */
const STATUS: Record<string, { label: string; tone: "high" | "low" | "default" }> = {
  live: { label: "Live now", tone: "high" },
  scheduled: { label: "Scheduled", tone: "low" },
  ended: { label: "Ended", tone: "default" },
  cancelled: { label: "Cancelled", tone: "default" },
};

function Panel({ id, title, caption, children }: { id: string; title: string; caption?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="overflow-hidden rounded-card border border-line bg-surface shadow-warm-1">
      <div className="px-[18px] pb-3 pt-4 sm:px-[22px] sm:pt-[18px]">
        <h2 id={id} className="text-[16px] font-semibold text-ink">
          {title}
        </h2>
        {caption ? <p className="mt-0.5 text-[13.5px] text-ink-3">{caption}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="px-[18px] pb-5 text-[14.5px] text-ink-3 sm:px-[22px]">{children}</p>;
}

export default async function PersonPage({ params }: { params: { personId: string } }) {
  if (!UUID.test(params.personId)) notFound();
  const [res, members] = await Promise.all([
    apiSafe<PersonProfile>(`/bff/people/${params.personId}`),
    listMembers(),
  ]);
  if (!res.ok) notFound();
  const person = fromApi(res.data, members?.find((m) => m.id === params.personId));
  const firstName = person.name.split(" ")[0];

  const meetings = [...person.meetings].sort((a, b) => (b.when ?? "").localeCompare(a.when ?? ""));

  return (
    <div className="mx-auto flex max-w-[1240px] flex-col">
      <Link
        href="/org"
        className="inline-flex min-h-[40px] items-center gap-1.5 self-start rounded-ctl pr-2 text-[13.5px] font-semibold text-ink-3 transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} weight="bold" aria-hidden />
        Org chart
      </Link>

      <header className="flex flex-wrap items-center gap-x-6 gap-y-5 pb-7 pt-2">
        <Avatar name={person.name} id={person.email || undefined} src={person.avatarUrl} size="xl" />
        <div className="min-w-0 flex-[1_1_280px]">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="display text-[clamp(28px,3vw,34px)] text-ink-display">{person.name}</h1>
            {person.lead ? <Badge>Team lead</Badge> : null}
          </div>
          <p className="mt-1.5 text-[15px] text-ink-3">{person.role ?? "No role set yet"}</p>
          {person.department || person.teams.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {person.department ? (
                <Badge>
                  <UsersThree size={14} aria-hidden />
                  {person.department}
                </Badge>
              ) : null}
              {person.teams.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-line-2 px-2.5 py-[2px] text-[12.5px] font-semibold text-ink-2"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {person.email ? (
          <a
            href={`mailto:${person.email}`}
            className="inline-flex h-11 min-w-0 max-w-full items-center gap-2 rounded-ctl bg-pill px-[18px] text-[15px] font-semibold text-pill-on transition-[background-color,box-shadow] hover:bg-pill-2 hover:shadow-warm-2"
          >
            <EnvelopeSimple size={17} aria-hidden className="shrink-0" />
            <span className="truncate">Email {firstName}</span>
          </a>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel id="person-about" title="About">
            {person.bio ? (
              <p className="max-w-[68ch] px-[18px] pb-5 text-[15px] leading-relaxed text-ink-2 sm:px-[22px]">{person.bio}</p>
            ) : (
              <Quiet>No bio yet.</Quiet>
            )}
          </Panel>

          <Panel id="person-meetings" title="Recent meetings" caption="Meetings they took part in, newest first.">
            {meetings.length ? (
              <ul className="divide-y divide-line border-t border-line">
                {meetings.map((m) => {
                  const st = STATUS[m.status] ?? { label: m.status, tone: "default" as const };
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/meetings/${m.id}`}
                        className="group flex min-h-[56px] items-center gap-3.5 px-[18px] py-3 transition-colors hover:bg-surface-2 active:bg-bg-2 sm:px-[22px]"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-ctl bg-bg-2 text-ink-2">
                          <VideoCamera size={17} aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14.5px] font-semibold text-ink">{m.title}</span>
                          <span className="block text-[13px] text-ink-3">
                            {m.when ? dateFormatter.format(new Date(m.when)) : "Not scheduled"}
                          </span>
                        </span>
                        <Badge tone={st.tone}>{st.label}</Badge>
                        <CaretRight
                          size={14}
                          weight="bold"
                          className="shrink-0 text-ink-4 transition-[transform,color] group-hover:text-ink motion-safe:group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-[18px] pb-[18px] sm:px-[22px]">
                <EmptyState title="No meetings together yet" description={`Meetings ${firstName} takes part in will show up here.`} />
              </div>
            )}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Panel id="person-skills" title="Skills">
            {person.skills.length ? (
              <div className="flex flex-wrap gap-2 px-[18px] pb-5 sm:px-[22px]">
                {person.skills.map((s) => (
                  <Badge key={s}>{s}</Badge>
                ))}
              </div>
            ) : (
              <Quiet>No skills listed.</Quiet>
            )}
          </Panel>

          <Panel
            id="person-topics"
            title="What their agent listens for"
            caption="Topics from the role taxonomy. Their agent surfaces notes on these first."
          >
            {person.topics.length ? (
              <div className="flex flex-wrap gap-2 px-[18px] pb-5 sm:px-[22px]">
                {person.topics.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-full bg-signal-soft px-2.5 py-[3px] text-[12.5px] font-semibold text-signal-ink"
                  >
                    <Sparkle size={12} weight="fill" aria-hidden />
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              <Quiet>No topics yet.</Quiet>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
