import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardBody, CardHead } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ErrorState } from "@/components/ui/ErrorState";
import { Page, PageHead } from "@/components/ui/Page";
import { inlineLinkClass } from "@/components/ui/TextLink";
import { WelcomeVocabulary } from "@/components/org-brain/WelcomeVocabulary";
import { memberMap, type MemberOption } from "@/components/org-brain/types";
import { fetchGlossary, fetchGroundRules, fetchMemberOptions, fetchWelcome } from "@/lib/api/org-brain";
import { isOrgProfileEmpty, readingMinutes, type GlossaryTerm, type Welcome } from "@/lib/api/org-brain-types";
import { resolveOrgContext } from "@/lib/api/org-context";
import { fetchMyProfile } from "@/lib/api/profile";

export const metadata: Metadata = { title: "Welcome | Mytheus" };

/* The new joiner brief (ADR-0039 A8, Part E): what the company does, what matters now, who to
   ask, the words you will hear, your team, and what agents never note. Built to be read in about
   two minutes, top to bottom on a phone, in columns on a wide screen. Reads
   `GET /api/v1/org/welcome` (any member); the full vocabulary comes from `GET /org/glossary` when
   it answers, the welcome's first 40 otherwise. */

/** Everything on the page a reader actually reads, for the "minutes to read" line. */
function words(w: Welcome, terms: readonly GlossaryTerm[]): string {
  return [
    w.profile.description,
    w.goals.map((g) => `${g.title} ${g.description ?? ""}`).join(" "),
    w.owners.map((o) => o.topic).join(" "),
    terms.map((t) => `${t.term} ${t.definition ?? ""}`).join(" "),
  ].join(" ");
}

function Person({ m, id }: { m: MemberOption | undefined; id: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar name={m?.name ?? "Teammate"} id={m?.email ?? id} src={m?.imageUrl} size="sm" />
      <span className="truncate font-medium text-ink">{m?.name ?? "A former teammate"}</span>
    </span>
  );
}

export default async function WelcomePage() {
  const [ctx, welcome, glossary, rules, members, me] = await Promise.all([
    resolveOrgContext(),
    fetchWelcome(),
    fetchGlossary(),
    fetchGroundRules(),
    fetchMemberOptions(),
    fetchMyProfile(),
  ]);
  const orgName = ctx?.org.name || "your workspace";
  const isAdmin = ctx?.user.role === "admin";
  const people = memberMap(members ?? []);

  if (!welcome.ok)
    return (
      <Page>
        <PageHead title={`Welcome to ${orgName}`} />
        <ErrorState title="Your welcome brief could not be loaded" text="Nothing was lost. Try again in a moment." />
      </Page>
    );

  const w = welcome.data;
  const terms = glossary.ok && glossary.data.length >= w.glossary.length ? glossary.data : w.glossary;
  const nothing = isOrgProfileEmpty(w.profile) && !w.goals.length && !w.owners.length && !terms.length;
  const minutes = readingMinutes(words(w, terms));
  const team = w.team.filter((t) => !people.get(t.user_id)?.isYou);
  const ownersByPerson = new Map<string, string[]>();
  for (const o of w.owners) ownersByPerson.set(o.owner_user_id, [...(ownersByPerson.get(o.owner_user_id) ?? []), o.topic]);
  const never = rules.ok ? rules.data.never_record_topics : [];

  if (nothing)
    return (
      <Page>
        <PageHead
          title={`Welcome to ${orgName}`}
          context="This is where a new teammate reads what the company does, what matters now and who to ask."
        />
        <EmptyState
          art="brain"
          title="The brief has not been written yet"
          description={
            isAdmin
              ? "Fill in the company brain and this page writes itself: what you do, a few words, who owns what and one goal."
              : "Once an admin fills in the company brain, this page shows what the company does, its goals and who to ask."
          }
          action={
            isAdmin ? (
              <LinkButton href="/onboarding/workspace">Start the guided setup</LinkButton>
            ) : undefined
          }
        />
      </Page>
    );

  return (
    <Page>
      <article aria-labelledby="welcome-h" className="space-y-5">
        <PageHead
          id="welcome-h"
          title={`Welcome to ${orgName}`}
          context={`Your welcome brief, about ${minutes} ${minutes === 1 ? "minute" : "minutes"} to read.`}
        />

        {/* what the company does */}
        <Card as="section" aria-labelledby="about-h" className="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <h2 id="about-h" className="text-[17px] font-semibold leading-snug text-ink">
              What we do
            </h2>
            {w.profile.description.trim() ? (
              <p className="mt-2 max-w-[68ch] whitespace-pre-line text-pretty text-[17px] leading-relaxed text-ink-2">{w.profile.description.trim()}</p>
            ) : (
              <p className="mt-2 text-[15px] text-ink-3">The company has not described itself here yet.</p>
            )}
          </div>
          {w.profile.industry || w.profile.products.length || w.profile.customers.length ? (
            <dl className="grid content-start gap-5 rounded-ctl bg-bg-2 p-5 lg:self-start">
              {w.profile.industry ? (
                <div>
                  <dt className="text-[12.5px] font-semibold text-ink-3">Industry</dt>
                  <dd className="mt-1 text-[15px] font-medium text-ink">{w.profile.industry}</dd>
                </div>
              ) : null}
              {w.profile.products.length ? (
                <div>
                  <dt className="text-[12.5px] font-semibold text-ink-3">What we make</dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {w.profile.products.map((p) => (
                      <Chip key={p} tone="accent">
                        {p}
                      </Chip>
                    ))}
                  </dd>
                </div>
              ) : null}
              {w.profile.customers.length ? (
                <div>
                  <dt className="text-[12.5px] font-semibold text-ink-3">Who we make it for</dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {w.profile.customers.map((c) => (
                      <Chip key={c} tone="outline">
                        {c}
                      </Chip>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </Card>

        <div className="grid items-start gap-5 lg:grid-cols-2 xl:grid-cols-12">
          {/* what matters now */}
          <Card as="section" flush aria-labelledby="goals-h" className="xl:col-span-5">
            <CardHead id="goals-h" title="What matters now" right={w.goals.length ? <Chip>{w.goals.length} active</Chip> : undefined} />
            <CardBody>
              {w.goals.length ? (
                <ol className="space-y-4">
                  {w.goals.map((g, i) => (
                    <li key={g.id} className="flex gap-3.5">
                      <span aria-hidden className="display w-6 shrink-0 text-right text-[22px] leading-none tabular-nums text-signal-ink">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold leading-snug text-ink">{g.title}</p>
                        {g.description ? <p className="mt-1 text-[14px] leading-relaxed text-ink-3">{g.description}</p> : null}
                        {g.period || g.owner_user_id ? (
                          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[14px] text-ink-3">
                            {g.period ? <Chip>{g.period}</Chip> : null}
                            {g.owner_user_id ? <Person m={people.get(g.owner_user_id)} id={g.owner_user_id} /> : null}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-[15px] text-ink-3">No goals are written down yet.</p>
              )}
            </CardBody>
          </Card>

          {/* who to ask */}
          <Card as="section" flush aria-labelledby="owners-h" className="xl:col-span-4">
            <CardHead id="owners-h" title="Who to ask" />
            <CardBody>
              {ownersByPerson.size ? (
                <ul className="divide-y divide-line">
                  {Array.from(ownersByPerson.entries()).map(([id, topics]) => (
                    <li key={id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <Person m={people.get(id)} id={id} />
                      <span className="min-w-0 max-w-[60%] text-right text-[14px] leading-snug text-ink-2">{topics.join(", ")}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[15px] text-ink-3">Owners have not been named yet. Your team lead is a good first person to ask.</p>
              )}
            </CardBody>
          </Card>

          {/* your team */}
          <Card as="section" flush tone="well" aria-labelledby="team-h" className="lg:col-span-2 xl:col-span-3">
            <CardHead id="team-h" title="Your team" />
            <CardBody>
              {team.length ? (
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1">
                  {team.map((t) => {
                    const m = people.get(t.user_id);
                    return (
                      <li key={t.user_id} className="flex min-w-0 items-center gap-3">
                        <Avatar name={m?.name ?? "Teammate"} id={m?.email ?? t.user_id} src={m?.imageUrl} size="md" />
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] font-semibold text-ink">{m?.name ?? "A teammate"}</span>
                          {m?.email ? <span className="block truncate text-[12.5px] text-ink-3">{m.email}</span> : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-[15px] leading-relaxed text-ink-3">
                  You are not on a team yet. An admin adds you in{" "}
                  <Link href="/people" className={inlineLinkClass}>
                    People
                  </Link>
                  .
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* the words */}
        <Card as="section" flush aria-labelledby="vocab-h">
          <CardHead
            id="vocab-h"
            title="Words you will hear"
            right={terms.length ? <Chip>{`${terms.length} ${terms.length === 1 ? "word" : "words"}`}</Chip> : undefined}
          />
          <CardBody>
            {terms.length ? <WelcomeVocabulary terms={terms} /> : <p className="text-[15px] text-ink-3">No company words are written down yet.</p>}
          </CardBody>
        </Card>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* what agents leave alone */}
          <Card as="section" flush aria-labelledby="never-h">
            <CardHead id="never-h" title="What Mytes never note" />
            <CardBody>
              {never.length ? (
                <>
                  <ul className="flex flex-wrap gap-2">
                    {never.map((t) => (
                      <li key={t}>
                        <Chip tone="outline">{t}</Chip>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 max-w-[68ch] text-[14px] leading-relaxed text-ink-3">
                    Mytes are told to keep no notes, suggestions or actions when a meeting is mainly about these. It is an instruction to
                    them, not a guarantee, and the transcript is still recorded.
                  </p>
                </>
              ) : (
                <p className="text-[15px] text-ink-3">{rules.ok ? "No topics are set as off limits." : "These could not be loaded just now."}</p>
              )}
            </CardBody>
          </Card>

          {/* next step */}
          <Card as="section" tone="well" aria-labelledby="next-h">
            <h2 id="next-h" className="display text-[22px] text-ink">
              {me?.role ? "Your Myte is ready" : "One thing to do next"}
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
              {me?.role
                ? "It already knows all of the above, and it listens for your work in every meeting you join."
                : "Tell your Myte what you do. It knows the company now; your role tells it what to keep for you."}
            </p>
            <div className="mt-4">
              <LinkButton href={me?.role ? "/agent" : "/onboarding/profile"} variant={me?.role ? "outline" : "primary"}>
                {me?.role ? "Meet your Myte" : "Add your role"}
              </LinkButton>
            </div>
          </Card>
        </div>
      </article>
    </Page>
  );
}
